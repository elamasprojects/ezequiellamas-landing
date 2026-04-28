// publish-now (Zernio + Bunny version): submits a scheduled_post to Zernio.
// Videos live on Bunny Stream; we pass the public CDN URL of /play_720p.mp4.
// Carousel slides still live on Supabase Storage; we sign per-slide URLs.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Platform = "instagram" | "youtube" | "tiktok";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

interface PostRow {
  id: string;
  owner_id: string;
  asset_kind: "video" | "carousel";
  bunny_video_id: string | null;
  bunny_library_id: string | null;
  carousel_id: string | null;
  title: string | null;
  caption_default: string | null;
  captions: Record<string, string> | null;
  hashtags: string[];
  status: string;
  format_id: string | null;
  script_id: string | null;
  thumbnail_url: string | null;
  scheduled_at: string;
  timezone: string;
}

interface SocialAccountRow {
  id: string;
  owner_id: string;
  platform: Platform;
  external_account_id: string;
  meta: Record<string, unknown> & { zernio_account_id?: string };
}

function effectiveCaption(post: PostRow, platform: Platform): string {
  const captions = (post.captions ?? {}) as Record<string, string>;
  const base = captions[platform]?.trim() || post.caption_default?.trim() || "";
  if (post.hashtags && post.hashtags.length > 0) {
    const tags = post.hashtags.map((t) => `#${t.replace(/^#/, "")}`).join(" ");
    return base ? `${base}\n\n${tags}` : tags;
  }
  return base;
}

function bunnyCdnUrl(bunnyVideoId: string): string {
  const host = Deno.env.get("BUNNY_CDN_HOSTNAME");
  if (!host) throw new Error("BUNNY_CDN_HOSTNAME not set");
  // Use the encoded MP4 fallback (always available when MP4 Fallback is enabled
  // on the library) instead of /original (which requires Early-Play, off by
  // default → 403). Whisper + IG/YT/TT all consume this fine.
  return `https://${host}/${bunnyVideoId}/play_720p.mp4`;
}

async function signedImageUrl(admin: SupabaseClient, path: string): Promise<string> {
  const { data, error } = await admin.storage.from("carousel-renders").createSignedUrl(path, 60 * 60);
  if (error || !data) throw new Error(error?.message ?? "signed_image_url_failed");
  return data.signedUrl;
}

async function buildMediaItems(
  admin: SupabaseClient,
  post: PostRow,
): Promise<Array<{ type: "video" | "image"; url: string }>> {
  if (post.asset_kind === "video") {
    if (!post.bunny_video_id) throw new Error("missing_bunny_video_id");
    return [{ type: "video", url: bunnyCdnUrl(post.bunny_video_id) }];
  }

  // Carousel: pull rendered slides from carousel_slides ordered by index
  if (!post.carousel_id) throw new Error("missing_carousel_id");
  const { data: slides, error } = await admin
    .from("carousel_slides")
    .select("index, rendered_path, render_status")
    .eq("carousel_id", post.carousel_id)
    .order("index", { ascending: true });
  if (error) throw new Error(error.message);
  if (!slides || slides.length === 0) throw new Error("carousel_has_no_slides");
  // Slide-level render_status canonical values: pending | queued | rendering | done | error.
  // (Carousel-level `carousels.status` uses 'rendered' once all slides finish — different field.)
  const ready = slides.filter((s) => s.rendered_path && s.render_status === "done");
  if (ready.length === 0) throw new Error("carousel_not_rendered");
  if (ready.length > 10) throw new Error("carousel_max_10_slides");

  const items: Array<{ type: "image"; url: string }> = [];
  for (const s of ready) {
    const url = await signedImageUrl(admin, s.rendered_path!);
    items.push({ type: "image", url });
  }
  return items;
}

function platformSpecificData(
  post: PostRow,
  platform: Platform,
): Record<string, unknown> | undefined {
  if (platform === "instagram" && post.asset_kind === "video") {
    return { mediaType: "reel" };
  }
  if (platform === "youtube") {
    const titleBase =
      post.title ?? (post.caption_default?.split("\n")[0]?.slice(0, 95) ?? "Video");
    const fullCaption = effectiveCaption(post, "youtube");
    const isShorts = /\#shorts/i.test(fullCaption) || /\#shorts/i.test(titleBase);
    const title = isShorts && !/\#shorts/i.test(titleBase) ? `${titleBase} #Shorts` : titleBase;
    return {
      title,
      privacy: "public",
      tags: post.hashtags ?? [],
    };
  }
  return undefined;
}

async function callZernioCreate(payload: Record<string, unknown>): Promise<{
  ok: boolean;
  postId?: string;
  raw: unknown;
  error?: string;
}> {
  const apiKey = Deno.env.get("ZERNIO_API_KEY");
  if (!apiKey) return { ok: false, raw: null, error: "ZERNIO_API_KEY not set" };

  const r = await fetch("https://zernio.com/api/v1/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  let body: unknown;
  try {
    body = await r.json();
  } catch {
    body = await r.text();
  }
  if (!r.ok) {
    const errMsg =
      typeof body === "object" && body && "error" in body
        ? String((body as { error: unknown }).error)
        : `zernio_http_${r.status}`;
    return { ok: false, raw: body, error: errMsg };
  }

  const obj = body as Record<string, unknown>;
  const data = (obj.data ?? obj) as Record<string, unknown>;
  const post = (data.post ?? data) as Record<string, unknown>;
  const postId =
    (post._id as string | undefined) ?? (post.id as string | undefined) ?? undefined;
  return { ok: true, postId, raw: body };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    const isService = auth === `Bearer ${serviceKey}`;

    const admin = createClient(supabaseUrl, serviceKey);

    let userId: string | null = null;
    if (!isService) {
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: auth } },
      });
      const { data: userData, error: uErr } = await userClient.auth.getUser();
      if (uErr || !userData.user) return json(401, { error: "unauthenticated" });
      userId = userData.user.id;
    }

    const body = (await req.json()) as { scheduled_post_id: string; platform?: Platform };
    if (!body?.scheduled_post_id) return json(400, { error: "missing_scheduled_post_id" });

    const { data: postData, error: pErr } = await admin
      .from("scheduled_posts")
      .select("*")
      .eq("id", body.scheduled_post_id)
      .maybeSingle();
    if (pErr) return json(500, { error: pErr.message });
    if (!postData) return json(404, { error: "post_not_found" });
    if (!isService && postData.owner_id !== userId) return json(403, { error: "forbidden" });

    const post = postData as unknown as PostRow;

    let jobsQuery = admin
      .from("publish_jobs")
      .select("id, platform, status, attempt, max_attempts")
      .eq("scheduled_post_id", post.id)
      .in("status", ["pending", "failed"]);
    if (body.platform) jobsQuery = jobsQuery.eq("platform", body.platform);
    const { data: jobs, error: jErr } = await jobsQuery;
    if (jErr) return json(500, { error: jErr.message });
    if (!jobs || jobs.length === 0) return json(200, { ok: true, results: [] });

    const platforms = jobs.map((j) => j.platform as Platform);
    const { data: accounts, error: aErr } = await admin
      .from("social_accounts")
      .select("id, owner_id, platform, external_account_id, meta")
      .eq("owner_id", post.owner_id)
      .in("platform", platforms);
    if (aErr) return json(500, { error: aErr.message });

    const accountByPlatform = new Map<Platform, SocialAccountRow>();
    for (const a of accounts ?? []) {
      accountByPlatform.set(a.platform as Platform, a as unknown as SocialAccountRow);
    }

    await admin.from("scheduled_posts").update({ status: "publishing" }).eq("id", post.id);

    let mediaItems: Array<{ type: string; url: string }>;
    try {
      mediaItems = await buildMediaItems(admin, post);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      for (const job of jobs) {
        await admin
          .from("publish_jobs")
          .update({
            status: "failed",
            last_error: msg,
            last_error_at: new Date().toISOString(),
            finished_at: new Date().toISOString(),
          })
          .eq("id", job.id);
      }
      await admin.from("scheduled_posts").update({ status: "failed" }).eq("id", post.id);
      return json(400, { ok: false, error: msg });
    }

    const zernioPlatforms: Array<Record<string, unknown>> = [];
    const sentJobIds: string[] = [];
    const skipped: { job_id: string; platform: Platform; error: string }[] = [];
    for (const job of jobs) {
      const platform = job.platform as Platform;
      const account = accountByPlatform.get(platform);
      if (!account) {
        await admin
          .from("publish_jobs")
          .update({
            status: "failed",
            last_error: `${platform}_not_connected`,
            last_error_at: new Date().toISOString(),
            finished_at: new Date().toISOString(),
          })
          .eq("id", job.id);
        skipped.push({ job_id: job.id, platform, error: `${platform}_not_connected` });
        continue;
      }
      const zernioAccountId =
        (account.meta?.zernio_account_id as string | undefined) ?? account.external_account_id;
      const entry: Record<string, unknown> = {
        platform,
        accountId: zernioAccountId,
      };
      const psd = platformSpecificData(post, platform);
      if (psd) entry.platformSpecificData = psd;
      zernioPlatforms.push(entry);
      sentJobIds.push(job.id);
    }

    if (zernioPlatforms.length === 0) {
      await admin.from("scheduled_posts").update({ status: "failed" }).eq("id", post.id);
      return json(400, { ok: false, error: "no_connected_platforms", results: skipped });
    }

    const startedAt = new Date().toISOString();
    for (const jobId of sentJobIds) {
      const job = jobs.find((j) => j.id === jobId)!;
      await admin
        .from("publish_jobs")
        .update({
          status: "in_progress",
          started_at: startedAt,
          attempt: (job.attempt ?? 0) + 1,
        })
        .eq("id", jobId);
    }

    const defaultContent = effectiveCaption(post, "instagram");

    const zernioPayload: Record<string, unknown> = {
      content: defaultContent,
      platforms: zernioPlatforms,
      mediaItems,
      publishNow: true,
      timezone: post.timezone ?? "America/Argentina/Buenos_Aires",
    };

    const result = await callZernioCreate(zernioPayload);

    if (!result.ok) {
      const finished = new Date().toISOString();
      for (const jobId of sentJobIds) {
        await admin
          .from("publish_jobs")
          .update({
            status: "failed",
            last_error: result.error ?? "zernio_failed",
            last_error_at: finished,
            finished_at: finished,
            payload: { zernio_response: result.raw } as never,
          })
          .eq("id", jobId);
      }
      await admin.from("scheduled_posts").update({ status: "failed" }).eq("id", post.id);
      await admin.from("notifications").insert({
        user_id: post.owner_id,
        kind: "publishing.failed",
        title: "Hubo errores al publicar",
        body: result.error ?? "Zernio rechazó el post",
        link: `/app/admin/publishing/${post.id}`,
        dedupe_key: `pub:fail:${post.id}:${Date.now()}`,
      });
      return json(200, { ok: false, results: skipped, error: result.error });
    }

    for (const jobId of sentJobIds) {
      await admin
        .from("publish_jobs")
        .update({
          payload: {
            zernio_post_id: result.postId,
            zernio_response: result.raw,
          } as never,
        })
        .eq("id", jobId);
    }

    return json(200, {
      ok: true,
      zernio_post_id: result.postId,
      results: [
        ...sentJobIds.map((id) => ({ job_id: id, status: "in_progress" as const })),
        ...skipped.map((s) => ({ job_id: s.job_id, status: "failed" as const, error: s.error })),
      ],
    });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : "unknown" });
  }
});
