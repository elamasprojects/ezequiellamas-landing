// zernio-webhook: receives events from Zernio.
// Subscribed events: post.scheduled, post.failed, post.cancelled, post.recycled,
// post.partial, post.published, account.connected, account.disconnected,
// account.ads.initial_sync_completed.
//
// Public endpoint (verify_jwt=false). Signature validation is HMAC-SHA256 of the
// raw body using ZERNIO_WEBHOOK_SECRET, sent as `X-Zernio-Signature`.
//
// On each terminal post event (post.published / post.partial / post.failed),
// after the per-job rollup, this function ALSO:
//   1) Inserts a notifications row + fires web push (via notify() helper).
//   2) If the notification insert was first-time (no dedupe collision on Zernio
//      webhook retries), sends a branded HTML email via Resend to a static list:
//      the owner's profile.email + every address in env
//      PUBLISHING_NOTIFY_EXTRA_EMAILS (comma-separated).
//      The email body lists each platform with a clickable link to the live
//      post (from publish_jobs.provider_post_url) or the per-platform error.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-zernio-signature, x-zernio-event",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Platform = "instagram" | "youtube" | "tiktok";
const SUPPORTED_PLATFORMS: ReadonlySet<Platform> = new Set([
  "instagram",
  "youtube",
  "tiktok",
]);

const PLATFORM_LABEL: Record<Platform, string> = {
  instagram: "Instagram",
  youtube: "YouTube Shorts",
  tiktok: "TikTok",
};

const APP_URL = Deno.env.get("APP_URL") ?? "https://ezequiellamas.com";
const ZERNIO_API_KEY = Deno.env.get("ZERNIO_API_KEY") ?? "";
const ZERNIO_BASE = "https://zernio.com/api/v1";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL =
  Deno.env.get("FROM_EMAIL") ?? "Ezequiel Lamas <hola@updates.ezequiellamas.com>";
const PUBLISHING_NOTIFY_EXTRA_EMAILS = (
  Deno.env.get("PUBLISHING_NOTIFY_EXTRA_EMAILS") ?? ""
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const HEADER_HTML = `<div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0a0a0a;">`;
const FOOTER_HTML = `<p style="margin-top:32px;color:#8a8580;font-size:12px;">Ezequiel Lamas · ezequiellamas.com</p></div>`;

function button(label: string, url: string): string {
  return `<p style="margin:24px 0;"><a href="${url}" style="display:inline-block;background:#c8ff00;color:#0a0a0a;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">${label}</a></p>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

async function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader) return false;
  // Accept formats: "sha256=hex", "hex", or "v1=hex"
  const provided = signatureHeader.replace(/^(sha256=|v1=)/, "").trim().toLowerCase();
  if (!/^[0-9a-f]+$/.test(provided)) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const expected = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // Constant-time compare
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

/** Try to extract per-platform results from a Zernio post payload. Schema is
 * not documented in detail, so we look in several common spots. */
function extractPlatformResults(post: Record<string, unknown>): Map<
  Platform,
  { status: "published" | "failed" | "unknown"; url?: string; postId?: string; error?: string }
> {
  const out = new Map<
    Platform,
    { status: "published" | "failed" | "unknown"; url?: string; postId?: string; error?: string }
  >();
  const candidates: unknown[] = [];

  if (Array.isArray(post.platforms)) candidates.push(post.platforms);
  if (Array.isArray((post as { results?: unknown }).results))
    candidates.push((post as { results: unknown[] }).results);
  if (Array.isArray((post as { platformResults?: unknown }).platformResults))
    candidates.push((post as { platformResults: unknown[] }).platformResults);

  for (const arr of candidates) {
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      if (typeof item === "string") {
        if (SUPPORTED_PLATFORMS.has(item as Platform)) {
          if (!out.has(item as Platform)) out.set(item as Platform, { status: "unknown" });
        }
        continue;
      }
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const platform = (o.platform ?? o.name) as string | undefined;
      if (!platform || !SUPPORTED_PLATFORMS.has(platform as Platform)) continue;
      const statusRaw = String(o.status ?? "").toLowerCase();
      const status: "published" | "failed" | "unknown" =
        statusRaw === "published" || statusRaw === "success" || statusRaw === "succeeded"
          ? "published"
          : statusRaw === "failed" || statusRaw === "error"
            ? "failed"
            : "unknown";
      out.set(platform as Platform, {
        status,
        url:
          (o.url as string | undefined) ??
          (o.permalink as string | undefined) ??
          (o.postUrl as string | undefined),
        postId:
          (o.postId as string | undefined) ??
          (o.providerPostId as string | undefined) ??
          (o.id as string | undefined),
        error:
          (o.error as string | undefined) ??
          (o.errorMessage as string | undefined) ??
          (o.message as string | undefined),
      });
    }
  }

  return out;
}

/** Insert into notifications + fire web push.
 * Returns true if this was the first time we saw this dedupe_key (the insert
 * actually wrote a row), false if it was a dedupe collision (Zernio retry).
 * Callers use the boolean to gate side effects like email so we don't double-send. */
async function notify(
  admin: SupabaseClient,
  ownerId: string,
  kind: string,
  title: string,
  body: string,
  link: string,
  dedupe: string,
): Promise<boolean> {
  let inserted = false;
  try {
    const { data, error } = await admin
      .from("notifications")
      .insert({
        user_id: ownerId,
        kind,
        title,
        body,
        link,
        dedupe_key: dedupe,
      })
      .select("id")
      .maybeSingle();
    if (error) {
      // Unique-violation on dedupe_key → already processed this event
      if (/duplicate|unique/i.test(error.message)) {
        return false;
      }
      console.warn("notify_insert_failed", error.message);
      return false;
    }
    inserted = !!data?.id;
  } catch (e) {
    console.warn("notify_failed", e);
    return false;
  }

  if (!inserted) return false;

  // Fire push (best-effort) only on first-time
  try {
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push`;
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      },
      body: JSON.stringify({ user_id: ownerId, title, body, url: link }),
    });
  } catch (e) {
    console.warn("send_push_failed", e);
  }
  return true;
}

function renderPlatformList(
  jobs: Array<{
    platform: string;
    status: string;
    provider_post_url: string | null;
    last_error: string | null;
  }>,
): string {
  if (jobs.length === 0) return "";
  const rows = jobs
    .map((j) => {
      const label = PLATFORM_LABEL[j.platform as Platform] ?? j.platform;
      if (j.status === "succeeded" && j.provider_post_url) {
        return `<li style="margin:10px 0;"><strong>${escapeHtml(label)}</strong> → <a href="${escapeHtml(j.provider_post_url)}" style="color:#0a0a0a;background:#c8ff00;padding:3px 10px;border-radius:4px;text-decoration:none;font-weight:600;">ver post</a></li>`;
      }
      if (j.status === "failed") {
        const err = j.last_error ? `: ${escapeHtml(j.last_error)}` : "";
        return `<li style="margin:10px 0;color:#ff6b35;"><strong>${escapeHtml(label)}</strong> — falló${err}</li>`;
      }
      return `<li style="margin:10px 0;color:#5a5550;"><strong>${escapeHtml(label)}</strong> — ${escapeHtml(j.status)}</li>`;
    })
    .join("");
  return `<ul style="padding-left:20px;list-style:disc;margin:16px 0;">${rows}</ul>`;
}

async function sendPublishingEmail(opts: {
  kind: "succeeded" | "partial" | "failed";
  postTitle: string | null;
  scheduledPostId: string;
  ownerEmail: string | null;
  platformJobs: Array<{
    platform: string;
    status: string;
    provider_post_url: string | null;
    last_error: string | null;
  }>;
}): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn("publishing_email_skipped_no_resend_key");
    return;
  }
  const recipients = Array.from(
    new Set(
      [opts.ownerEmail ?? null, ...PUBLISHING_NOTIFY_EXTRA_EMAILS]
        .filter((e): e is string => !!e && /@/.test(e)),
    ),
  );
  if (recipients.length === 0) {
    console.warn("publishing_email_skipped_no_recipients", opts.scheduledPostId);
    return;
  }

  const titleSafe = escapeHtml(opts.postTitle ?? "Tu post");
  const deepLink = `${APP_URL}/app/admin/publishing/${opts.scheduledPostId}`;
  const platformsHtml = renderPlatformList(opts.platformJobs);

  let subject: string;
  let heading: string;
  let intro: string;
  let cta: string;
  if (opts.kind === "succeeded") {
    subject = `${opts.postTitle ?? "Tu post"} se publicó`;
    heading = `<span style="color:#c8ff00;background:#0a0a0a;padding:0 8px;">Publicado</span>`;
    intro = `<strong>${titleSafe}</strong> salió a las plataformas seleccionadas.`;
    cta = "Ver detalles en la app";
  } else if (opts.kind === "partial") {
    subject = `${opts.postTitle ?? "Tu post"} se publicó parcialmente`;
    heading = `Publicado <span style="color:#ff6b35;">parcialmente</span>`;
    intro = `<strong>${titleSafe}</strong> salió en algunas plataformas pero otras fallaron.`;
    cta = "Ver detalles y reintentar";
  } else {
    subject = `Falló la publicación de ${opts.postTitle ?? "tu post"}`;
    heading = `Falló la <span style="color:#ff6b35;">publicación</span>`;
    intro = `Hubo un error publicando <strong>${titleSafe}</strong>.`;
    cta = "Ver detalles y reintentar";
  }

  const html = `${HEADER_HTML}
    <h1 style="font-family:Georgia,serif;font-style:italic;font-size:24px;margin:0 0 16px;">${heading}</h1>
    <p>${intro}</p>
    ${platformsHtml}
    ${button(cta, deepLink)}
  ${FOOTER_HTML}`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: recipients,
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(
        "publishing_email_resend_non_2xx",
        opts.scheduledPostId,
        res.status,
        errText.slice(0, 300),
      );
    }
  } catch (e) {
    console.warn("publishing_email_fetch_failed", opts.scheduledPostId, e);
  }
}

async function rollupPostStatus(admin: SupabaseClient, postId: string): Promise<void> {
  const { data: jobs } = await admin
    .from("publish_jobs")
    .select("status")
    .eq("scheduled_post_id", postId);
  if (!jobs || jobs.length === 0) return;
  const statuses = jobs.map((j) => j.status);
  let next: string;
  if (statuses.every((s) => s === "succeeded")) next = "published";
  else if (statuses.some((s) => s === "in_progress" || s === "pending")) next = "publishing";
  else if (
    statuses.some((s) => s === "succeeded") &&
    statuses.some((s) => s === "failed")
  )
    next = "partial";
  else if (statuses.every((s) => s === "failed")) next = "failed";
  else if (statuses.every((s) => s === "cancelled")) next = "cancelled";
  else next = "publishing";
  await admin.from("scheduled_posts").update({ status: next }).eq("id", postId);
}

/** Link a successful job to videos / video_posts so the existing analytics
 * pipeline (Apify scrape + multiplier) sees the post. Idempotent: skips if a
 * video_post row for the same source_url already exists. */
async function linkSucceededJobToVideoModel(
  admin: SupabaseClient,
  jobId: string,
  ownerId: string,
  platform: Platform,
  providerPostUrl: string | null,
  postRow: { script_id: string | null; format_id: string | null; title: string | null; thumbnail_url: string | null; caption_default: string | null; captions: Record<string, string> | null; hashtags: string[] },
  postedAtIso: string,
): Promise<void> {
  if (!providerPostUrl) return;

  const { data: existingPost } = await admin
    .from("video_posts")
    .select("id, video_id")
    .eq("source_url", providerPostUrl)
    .maybeSingle();

  if (existingPost?.id) {
    await admin
      .from("publish_jobs")
      .update({ video_id: existingPost.video_id, video_post_id: existingPost.id })
      .eq("id", jobId);
    return;
  }

  let videoId: string | null = null;
  if (postRow.script_id) {
    const { data: existing } = await admin
      .from("videos")
      .select("id")
      .eq("owner_id", ownerId)
      .eq("script_id", postRow.script_id)
      .maybeSingle();
    if (existing?.id) videoId = existing.id;
  }
  if (!videoId) {
    const { data: newVideo } = await admin
      .from("videos")
      .insert({
        owner_id: ownerId,
        title: postRow.title ?? null,
        format_id: postRow.format_id ?? null,
        script_id: postRow.script_id ?? null,
      })
      .select("id")
      .single();
    videoId = newVideo?.id ?? null;
  }

  if (!videoId) return;

  const captionPlatform = (postRow.captions ?? {})[platform];
  const caption = captionPlatform?.trim() || postRow.caption_default?.trim() || null;

  const { data: vp } = await admin
    .from("video_posts")
    .insert({
      video_id: videoId,
      platform,
      source_url: providerPostUrl,
      posted_at: postedAtIso,
      caption,
      hashtags: postRow.hashtags ?? [],
      thumbnail_url: postRow.thumbnail_url ?? null,
    })
    .select("id")
    .single();

  if (vp?.id) {
    await admin
      .from("publish_jobs")
      .update({ video_id: videoId, video_post_id: vp.id })
      .eq("id", jobId);
  }
}

/** (M37) Create the preset comment→DM (lead magnet) automation in Zernio once the
 * Instagram leg is live. Per-post automations need the native IG media id, which
 * only exists post-publish. Idempotent: skips if already created. */
async function maybeCreateCommentAutomation(
  admin: SupabaseClient,
  scheduledPostId: string,
  parent: Record<string, unknown>,
  zernioPostId: string,
  igPlatformPostId: string | null,
): Promise<void> {
  if (!parent.comment_automation_enabled) return;
  if (parent.zernio_automation_id || parent.comment_automation_status === "created") return;

  const fail = (msg: string) =>
    admin
      .from("scheduled_posts")
      .update({ comment_automation_status: "failed", comment_automation_error: msg })
      .eq("id", scheduledPostId);

  if (!ZERNIO_API_KEY) return void (await fail("ZERNIO_API_KEY not set"));
  if (!igPlatformPostId)
    return void (await fail("Instagram no devolvió el media id en el webhook"));

  const ownerId = parent.owner_id as string;
  const { data: igAccount } = await admin
    .from("social_accounts")
    .select("external_account_id, meta")
    .eq("owner_id", ownerId)
    .eq("platform", "instagram")
    .maybeSingle();
  const meta = (igAccount?.meta ?? {}) as Record<string, unknown>;
  const accountId =
    (meta.zernio_account_id as string | undefined) ??
    (igAccount?.external_account_id as string | undefined);
  const profileId = meta.zernio_profile_id as string | undefined;
  if (!accountId || !profileId)
    return void (await fail("Falta zernio_account_id / profile_id de la cuenta de Instagram"));

  const linkUrl = parent.comment_automation_link_url as string | null;
  const buttonTitle = ((parent.comment_automation_button_title as string | null) ?? "Quiero el link").slice(0, 20);
  const buttons = linkUrl ? [{ type: "url", title: buttonTitle, url: linkUrl }] : [];
  const commentReply = (parent.comment_automation_reply as string | null)?.trim();

  const body: Record<string, unknown> = {
    profileId,
    accountId,
    platformPostId: igPlatformPostId,
    postId: zernioPostId,
    name: ((parent.title as string | null) ?? "Lead magnet").slice(0, 80),
    keywords: Array.isArray(parent.comment_automation_keywords) ? parent.comment_automation_keywords : [],
    matchMode: (parent.comment_automation_match_mode as string) ?? "contains",
    dmMessage: (parent.comment_automation_dm_message as string) ?? "",
    buttons,
    linkTracking: true,
  };
  if (commentReply) body.commentReply = commentReply;

  try {
    const r = await fetch(`${ZERNIO_BASE}/comment-automations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${ZERNIO_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const res = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    if (!r.ok) {
      return void (await fail((res.error as string) ?? `zernio_${r.status}`));
    }
    const automation = (res.automation ?? res) as Record<string, unknown>;
    await admin
      .from("scheduled_posts")
      .update({
        zernio_automation_id: (automation.id as string) ?? null,
        comment_automation_status: "created",
        comment_automation_error: null,
      })
      .eq("id", scheduledPostId);
  } catch (e) {
    await fail(e instanceof Error ? e.message : "unknown");
  }
}

async function handlePostEvent(
  admin: SupabaseClient,
  event: string,
  payload: Record<string, unknown>,
) {
  const post = (payload.post ?? payload.data ?? payload) as Record<string, unknown>;
  const zernioPostId =
    (post._id as string | undefined) ??
    (post.id as string | undefined) ??
    (payload.postId as string | undefined);
  if (!zernioPostId) {
    console.warn("webhook_post_event_missing_id", event);
    return;
  }

  const { data: jobs } = await admin
    .from("publish_jobs")
    .select("id, scheduled_post_id, platform, status, payload")
    .filter("payload->>zernio_post_id", "eq", zernioPostId);

  if (!jobs || jobs.length === 0) {
    console.warn("webhook_no_jobs_for_zernio_post_id", zernioPostId);
    return;
  }

  const scheduledPostId = jobs[0].scheduled_post_id as string;

  const { data: parentPost } = await admin
    .from("scheduled_posts")
    .select(
      "owner_id, script_id, format_id, title, thumbnail_url, caption_default, captions, hashtags, " +
        "comment_automation_enabled, comment_automation_keywords, comment_automation_match_mode, " +
        "comment_automation_dm_message, comment_automation_link_url, comment_automation_button_title, " +
        "comment_automation_reply, zernio_automation_id, comment_automation_status",
    )
    .eq("id", scheduledPostId)
    .maybeSingle();

  const finishedAt = new Date().toISOString();
  const platformResults = extractPlatformResults(post);

  if (event === "post.cancelled") {
    for (const job of jobs) {
      if (job.status === "succeeded" || job.status === "failed") continue;
      await admin
        .from("publish_jobs")
        .update({ status: "cancelled", finished_at: finishedAt })
        .eq("id", job.id);
    }
    // Tear down any comment-automation created for this post.
    const automationId = parentPost?.zernio_automation_id as string | null | undefined;
    if (automationId && ZERNIO_API_KEY) {
      try {
        await fetch(`${ZERNIO_BASE}/comment-automations/${automationId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${ZERNIO_API_KEY}` },
        });
        await admin
          .from("scheduled_posts")
          .update({ zernio_automation_id: null, comment_automation_status: "idle" })
          .eq("id", scheduledPostId);
      } catch (e) {
        console.warn("comment_automation_delete_failed", e);
      }
    }
    await rollupPostStatus(admin, scheduledPostId);
    return;
  }

  const eventGlobalSuccess = event === "post.published";
  const eventGlobalFailure = event === "post.failed";

  // (M37) Captured to wire up the comment→DM automation once IG is live.
  let igPlatformPostId: string | null = null;

  for (const job of jobs) {
    const platform = job.platform as Platform;
    const r = platformResults.get(platform);

    let nextStatus: "succeeded" | "failed" | null = null;
    let providerUrl: string | null = null;
    let providerPostId: string | null = null;
    let lastError: string | null = null;

    if (r?.status === "published") {
      nextStatus = "succeeded";
      providerUrl = r.url ?? null;
      providerPostId = r.postId ?? null;
    } else if (r?.status === "failed") {
      nextStatus = "failed";
      lastError = r.error ?? "zernio_platform_failed";
    } else if (eventGlobalSuccess) {
      nextStatus = "succeeded";
    } else if (eventGlobalFailure) {
      nextStatus = "failed";
      lastError =
        (post.error as string | undefined) ??
        (post.errorMessage as string | undefined) ??
        "zernio_post_failed";
    } else if (event === "post.partial") {
      continue;
    } else if (event === "post.scheduled" || event === "post.recycled") {
      continue;
    }

    if (!nextStatus) continue;

    const update: Record<string, unknown> = {
      status: nextStatus,
      finished_at: finishedAt,
    };
    if (nextStatus === "succeeded") {
      update.provider_post_url = providerUrl;
      update.provider_post_id = providerPostId;
    } else {
      update.last_error = lastError;
      update.last_error_at = finishedAt;
    }
    await admin.from("publish_jobs").update(update).eq("id", job.id);

    if (nextStatus === "succeeded" && platform === "instagram" && providerPostId) {
      igPlatformPostId = providerPostId;
    }

    if (nextStatus === "succeeded" && parentPost) {
      try {
        await linkSucceededJobToVideoModel(
          admin,
          job.id,
          parentPost.owner_id as string,
          platform,
          providerUrl,
          parentPost as never,
          finishedAt,
        );
      } catch (e) {
        console.warn("link_video_failed", e);
      }
    }
  }

  await rollupPostStatus(admin, scheduledPostId);

  if (!parentPost) return;

  // (M37) Create the lead-magnet comment automation once IG is live.
  if (event === "post.published" || event === "post.partial") {
    try {
      await maybeCreateCommentAutomation(
        admin,
        scheduledPostId,
        parentPost as Record<string, unknown>,
        zernioPostId,
        igPlatformPostId,
      );
    } catch (e) {
      console.warn("comment_automation_create_failed", e);
    }
  }

  const ownerId = parentPost.owner_id as string;
  const link = `/app/admin/publishing/${scheduledPostId}`;
  const postTitle = parentPost.title as string | null;

  let notified = false;
  let kindForEmail: "succeeded" | "partial" | "failed" | null = null;
  if (event === "post.published") {
    notified = await notify(
      admin,
      ownerId,
      "publishing.succeeded",
      "¡Publicado!",
      "Tu post salió a las plataformas seleccionadas.",
      link,
      `pub:done:${scheduledPostId}`,
    );
    kindForEmail = "succeeded";
  } else if (event === "post.failed") {
    notified = await notify(
      admin,
      ownerId,
      "publishing.failed",
      "Hubo errores al publicar",
      "Revisá los detalles del post para ver qué plataforma falló.",
      link,
      `pub:fail:${scheduledPostId}:${Date.now()}`,
    );
    kindForEmail = "failed";
  } else if (event === "post.partial") {
    notified = await notify(
      admin,
      ownerId,
      "publishing.partial",
      "Publicado parcialmente",
      "Algunas plataformas funcionaron, otras no.",
      link,
      `pub:partial:${scheduledPostId}:${Date.now()}`,
    );
    kindForEmail = "partial";
  }

  // Email only on first-time notify (dedupe protection against Zernio retries)
  // and only for terminal events that have an associated email template.
  if (notified && kindForEmail) {
    try {
      const [{ data: allJobs }, { data: ownerProfile }] = await Promise.all([
        admin
          .from("publish_jobs")
          .select("platform, status, provider_post_url, last_error")
          .eq("scheduled_post_id", scheduledPostId),
        admin
          .from("profiles")
          .select("email")
          .eq("id", ownerId)
          .maybeSingle(),
      ]);
      await sendPublishingEmail({
        kind: kindForEmail,
        postTitle,
        scheduledPostId,
        ownerEmail: (ownerProfile?.email as string | null) ?? null,
        platformJobs: (allJobs ?? []) as Array<{
          platform: string;
          status: string;
          provider_post_url: string | null;
          last_error: string | null;
        }>,
      });
    } catch (e) {
      console.warn("publishing_email_orchestrate_failed", scheduledPostId, e);
    }
  }
}

async function handleAccountEvent(
  admin: SupabaseClient,
  event: string,
  payload: Record<string, unknown>,
) {
  const account = (payload.account ?? payload.data ?? payload) as Record<string, unknown>;
  const zernioAccountId =
    (account._id as string | undefined) ?? (account.id as string | undefined);
  if (!zernioAccountId) return;

  if (event === "account.disconnected") {
    await admin
      .from("social_accounts")
      .update({ status: "revoked", updated_at: new Date().toISOString() })
      .filter("meta->>zernio_account_id", "eq", zernioAccountId);
  } else if (event === "account.connected") {
    await admin
      .from("social_accounts")
      .update({
        status: "connected",
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .filter("meta->>zernio_account_id", "eq", zernioAccountId);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method" });

  try {
    const rawBody = await req.text();

    const secret = Deno.env.get("ZERNIO_WEBHOOK_SECRET");
    if (secret) {
      const sig = req.headers.get("x-zernio-signature");
      const ok = await verifySignature(rawBody, sig, secret);
      if (!ok) {
        console.warn("zernio_webhook_invalid_signature");
        return json(401, { error: "invalid_signature" });
      }
    } else {
      console.warn("zernio_webhook_no_secret_configured");
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return json(400, { error: "invalid_json" });
    }

    const event = (parsed.event ?? parsed.type ?? req.headers.get("x-zernio-event")) as
      | string
      | undefined;
    if (!event) return json(400, { error: "missing_event" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    if (event.startsWith("post.")) {
      await handlePostEvent(admin, event, parsed);
    } else if (event.startsWith("account.")) {
      await handleAccountEvent(admin, event, parsed);
    } else {
      console.log("zernio_webhook_unhandled_event", event);
    }

    return json(200, { ok: true });
  } catch (e) {
    console.error("zernio_webhook_error", e);
    return json(500, { error: e instanceof Error ? e.message : "unknown" });
  }
});
