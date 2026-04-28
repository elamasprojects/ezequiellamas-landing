import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const APIFY_TOKEN_GLOBAL = Deno.env.get("APIFY_API_KEY");
const APIFY_TOKEN_INSTAGRAM = APIFY_TOKEN_GLOBAL || Deno.env.get("APIFY_API_KEY_INSTAGRAM");
const APIFY_TOKEN_YOUTUBE = APIFY_TOKEN_GLOBAL || Deno.env.get("APIFY_API_KEY_YOUTUBE");
const APIFY_TOKEN_TIKTOK = APIFY_TOKEN_GLOBAL || Deno.env.get("APIFY_API_KEY_TIKTOK");

const APIFY_BASE = "https://api.apify.com/v2/acts";

// Reuse the same bucket as scrape-video. Path scope keeps things organized:
// `referents/{referentId}/{platform}_{shortCode}.{ext}`. Bucket is public-read,
// no listing — anyone with the URL can fetch the image.
const THUMB_BUCKET = "video-thumbnails";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type Platform = "instagram" | "youtube" | "tiktok";

interface DiscoveredVideo {
  platform: Platform;
  source_url: string;
  apify_short_code: string;
  posted_at: string | null;
  title: string | null;
  caption: string | null;
  thumbnail_url: string | null;
  views_total: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  video_duration: number | null;
  raw: Record<string, unknown>;
}

async function callApify(actor: string, token: string, input: unknown): Promise<unknown[]> {
  const url = `${APIFY_BASE}/${actor}/run-sync-get-dataset-items?token=${token}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Apify ${res.status} (${actor}): ${errText.slice(0, 500)}`);
  }
  return (await res.json()) as unknown[];
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
// For DB columns typed as `integer` (e.g. video_duration). Apify IG/TT return
// fractional seconds (`6.266`), which Postgres rejects on int columns.
function roundOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null;
}
function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}
function parseDate(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}
function parseHmsToSeconds(v: unknown): number | null {
  if (typeof v !== "string") return num(v);
  const parts = v.split(":").map((p) => parseInt(p, 10)).filter((n) => Number.isFinite(n));
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}
/**
 * Downloads the platform CDN thumbnail and uploads it to our public bucket so
 * the UI can render it (Instagram blocks hot-linking from outside cdninstagram).
 * Returns the public bucket URL on success, or null if anything fails (caller
 * keeps the original CDN URL as fallback).
 */
async function persistThumbnail(
  service: SupabaseClient,
  referentId: string,
  platform: string,
  shortCode: string,
  cdnUrl: string,
): Promise<string | null> {
  try {
    const res = await fetch(cdnUrl);
    if (!res.ok) {
      console.warn(`[thumb] download ${res.status} for ${platform}/${shortCode}`);
      return null;
    }
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const blob = await res.blob();
    const ext = contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
        ? "webp"
        : "jpg";
    const safeShortCode = shortCode.replace(/[^a-zA-Z0-9_-]/g, "_");
    const path = `referents/${referentId}/${platform}_${safeShortCode}.${ext}`;
    const { error: upErr } = await service.storage
      .from(THUMB_BUCKET)
      .upload(path, blob, { contentType, upsert: true });
    if (upErr) {
      console.warn(`[thumb] upload failed ${platform}/${shortCode}:`, upErr.message);
      return null;
    }
    const { data: pub } = service.storage.from(THUMB_BUCKET).getPublicUrl(path);
    return pub.publicUrl;
  } catch (err) {
    console.warn(
      "[thumb] exception:",
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}

function stripHandle(raw: string): string {
  let h = raw.trim();
  if (h.startsWith("@")) h = h.slice(1);
  const m = h.match(/(?:instagram\.com|tiktok\.com|youtube\.com)\/(?:@)?([^\/?#]+)/i);
  if (m) h = m[1];
  return h.replace(/\/+$/, "");
}

async function discoverInstagram(handleRaw: string): Promise<DiscoveredVideo[]> {
  if (!APIFY_TOKEN_INSTAGRAM) throw new Error("APIFY_API_KEY (or APIFY_API_KEY_INSTAGRAM) not configured");
  const handle = stripHandle(handleRaw);
  const items = await callApify("apify~instagram-scraper", APIFY_TOKEN_INSTAGRAM, {
    directUrls: [`https://www.instagram.com/${handle}/`],
    resultsType: "posts",
    resultsLimit: 30,
    addParentData: false,
  });
  const out: DiscoveredVideo[] = [];
  for (const it of items) {
    const post = it as Record<string, unknown>;
    const shortCode = str(post.shortCode);
    const url = str(post.url) ?? (shortCode ? `https://www.instagram.com/p/${shortCode}/` : null);
    if (!shortCode || !url) continue;
    const ts = parseDate(post.timestamp);
    const views = num(post.videoPlayCount) ?? num(post.videoViewCount);
    out.push({
      platform: "instagram",
      source_url: url,
      apify_short_code: shortCode,
      posted_at: ts,
      title: null,
      caption: str(post.caption),
      thumbnail_url: str(post.displayUrl),
      views_total: views,
      likes: num(post.likesCount),
      comments: num(post.commentsCount),
      shares: null,
      saves: null,
      video_duration: roundOrNull(post.videoDuration),
      raw: post,
    });
  }
  return out;
}

async function discoverYouTube(handleRaw: string): Promise<DiscoveredVideo[]> {
  if (!APIFY_TOKEN_YOUTUBE) throw new Error("APIFY_API_KEY (or APIFY_API_KEY_YOUTUBE) not configured");
  let handle = handleRaw.trim();
  if (handle.startsWith("@")) handle = handle.slice(1);
  let url: string;
  if (/^https?:\/\//i.test(handle)) {
    url = handle.replace(/\/+$/, "");
    if (!url.endsWith("/videos") && !url.endsWith("/shorts")) url = `${url}/videos`;
  } else {
    url = `https://www.youtube.com/@${handle}/videos`;
  }
  const items = await callApify("streamers~youtube-scraper", APIFY_TOKEN_YOUTUBE, {
    startUrls: [{ url }],
    maxResults: 20,
    maxResultsShorts: 20,
    maxResultStreams: 0,
    subtitles: true,
  });
  const out: DiscoveredVideo[] = [];
  for (const it of items) {
    const v = it as Record<string, unknown>;
    const id = str(v.id);
    const u = str(v.url);
    if (!id || !u) continue;
    out.push({
      platform: "youtube",
      source_url: u,
      apify_short_code: id,
      posted_at: parseDate(v.date),
      title: str(v.title),
      caption: str(v.text),
      thumbnail_url: str(v.thumbnailUrl),
      views_total: num(v.viewCount),
      likes: num(v.likes),
      comments: num(v.commentsCount),
      shares: null,
      saves: null,
      video_duration: parseHmsToSeconds(v.duration),
      raw: v,
    });
  }
  return out;
}

async function discoverTikTok(handleRaw: string): Promise<DiscoveredVideo[]> {
  if (!APIFY_TOKEN_TIKTOK) throw new Error("APIFY_API_KEY (or APIFY_API_KEY_TIKTOK) not configured");
  const handle = stripHandle(handleRaw);
  const items = await callApify("clockworks~tiktok-scraper", APIFY_TOKEN_TIKTOK, {
    profiles: [handle],
    profileScrapeSections: ["videos"],
    profileSorting: "latest",
    resultsPerPage: 30,
    excludePinnedPosts: true,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
    shouldDownloadSubtitles: false,
    shouldDownloadSlideshowImages: false,
    shouldDownloadAvatars: false,
    shouldDownloadMusicCovers: false,
  });
  const out: DiscoveredVideo[] = [];
  for (const it of items) {
    const post = it as Record<string, unknown>;
    const id = str(post.id);
    const url = str(post.webVideoUrl);
    if (!id || !url) continue;
    const videoMeta = post.videoMeta as Record<string, unknown> | undefined;
    const covers = post.covers as Record<string, unknown> | undefined;
    const thumb =
      str(videoMeta?.coverUrl) ||
      str(videoMeta?.originalCoverUrl) ||
      str(covers?.origin) ||
      str(covers?.default);
    out.push({
      platform: "tiktok",
      source_url: url,
      apify_short_code: id,
      posted_at: parseDate(post.createTimeISO),
      title: null,
      caption: str(post.text),
      thumbnail_url: thumb,
      views_total: num(post.playCount),
      likes: num(post.diggCount),
      comments: num(post.commentCount),
      shares: num(post.shareCount),
      saves: num(post.collectCount),
      video_duration: roundOrNull(videoMeta?.duration),
      raw: post,
    });
  }
  return out;
}

async function upsertReferentVideos(
  client: SupabaseClient,
  referentId: string,
  videos: DiscoveredVideo[],
): Promise<number> {
  if (videos.length === 0) return 0;
  const nowIso = new Date().toISOString();
  const rows = videos.map((v) => ({
    referent_id: referentId,
    platform: v.platform,
    source_url: v.source_url,
    apify_short_code: v.apify_short_code,
    posted_at: v.posted_at,
    title: v.title,
    caption: v.caption,
    thumbnail_url: v.thumbnail_url,
    views_total: v.views_total,
    likes: v.likes,
    comments: v.comments,
    shares: v.shares,
    saves: v.saves,
    video_duration: v.video_duration,
    raw: v.raw as unknown as Record<string, unknown>,
    last_scraped_at: nowIso,
    metrics_updated_at: nowIso,
  }));
  const { error } = await client
    .from("referent_videos")
    .upsert(rows, { onConflict: "referent_id,source_url", ignoreDuplicates: false });
  if (error) throw new Error(`upsert referent_videos: ${error.message}`);
  return rows.length;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    // Service-role client used only for thumbnail uploads (bucket write
    // bypasses RLS). All DB upserts go through `userClient` so RLS still
    // gates ownership.
    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const referentId = typeof body?.referent_id === "string" ? body.referent_id : null;
    if (!referentId) return json({ error: "referent_id is required" }, 400);

    const { data: referent, error: refErr } = await userClient
      .from("referents")
      .select("id, instagram_handle, youtube_handle, tiktok_handle")
      .eq("id", referentId)
      .single();
    if (refErr || !referent) {
      return json({ error: refErr?.message ?? "Referent not found or not accessible" }, 404);
    }

    const ig = str(referent.instagram_handle);
    const yt = str(referent.youtube_handle);
    const tt = str(referent.tiktok_handle);
    if (!ig && !yt && !tt) {
      return json(
        { error: "Referente sin handles. Edita el referente y agregá al menos un link válido." },
        400,
      );
    }

    const tasks: Promise<{ platform: Platform; items?: DiscoveredVideo[]; error?: string }>[] = [];
    if (ig) tasks.push(discoverInstagram(ig).then((items) => ({ platform: "instagram" as const, items })).catch((e) => ({ platform: "instagram" as const, error: e instanceof Error ? e.message : String(e) })));
    if (yt) tasks.push(discoverYouTube(yt).then((items) => ({ platform: "youtube" as const, items })).catch((e) => ({ platform: "youtube" as const, error: e instanceof Error ? e.message : String(e) })));
    if (tt) tasks.push(discoverTikTok(tt).then((items) => ({ platform: "tiktok" as const, items })).catch((e) => ({ platform: "tiktok" as const, error: e instanceof Error ? e.message : String(e) })));

    const results = await Promise.all(tasks);
    const errors: { platform: string; error: string }[] = [];
    const scraped = { instagram: 0, youtube: 0, tiktok: 0 };

    for (const r of results) {
      if (r.error) {
        errors.push({ platform: r.platform, error: r.error });
        continue;
      }
      if (!r.items || r.items.length === 0) continue;
      try {
        // Persist thumbnails to our bucket so the UI can render them
        // (Instagram CDN blocks hot-linking). Done in parallel per platform
        // batch; individual failures keep the original CDN URL.
        await Promise.all(
          r.items.map(async (item) => {
            if (!item.thumbnail_url) return;
            const persisted = await persistThumbnail(
              service,
              referentId,
              item.platform,
              item.apify_short_code,
              item.thumbnail_url,
            );
            if (persisted) item.thumbnail_url = persisted;
          }),
        );
        const n = await upsertReferentVideos(userClient, referentId, r.items);
        scraped[r.platform] = n;
      } catch (e) {
        errors.push({ platform: r.platform, error: e instanceof Error ? e.message : String(e) });
      }
    }

    const totalScraped = scraped.instagram + scraped.youtube + scraped.tiktok;
    const allFailed = errors.length === results.length && totalScraped === 0;

    await userClient
      .from("referents")
      .update({
        last_scraped_at: new Date().toISOString(),
        last_scrape_error: allFailed ? errors[0]?.error ?? "Unknown" : null,
      })
      .eq("id", referentId);

    return json({ ok: !allFailed, scraped, errors });
  } catch (err) {
    return json({ error: String(err instanceof Error ? err.message : err) }, 500);
  }
});
