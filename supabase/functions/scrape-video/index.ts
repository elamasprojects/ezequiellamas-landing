import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const APIFY_TOKEN_GLOBAL = Deno.env.get("APIFY_API_KEY");
const APIFY_TOKEN_INSTAGRAM = APIFY_TOKEN_GLOBAL || Deno.env.get("APIFY_API_KEY_INSTAGRAM");
const APIFY_TOKEN_YOUTUBE = APIFY_TOKEN_GLOBAL || Deno.env.get("APIFY_API_KEY_YOUTUBE");
const APIFY_TOKEN_TIKTOK = APIFY_TOKEN_GLOBAL || Deno.env.get("APIFY_API_KEY_TIKTOK");

const APIFY_BASE = "https://api.apify.com/v2/acts";
const BUCKET = "video-thumbnails";

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

type Platform = "instagram" | "youtube" | "tiktok" | "other";

interface PostUpdate {
  apify_short_code?: string | null;
  caption?: string | null;
  thumbnail_url?: string | null;
  thumbnail_cdn_url?: string | null;
  thumbnail_storage_path?: string | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  views_total?: number | null;
  posted_at?: string | null;
  video_duration?: number | null;
  dimensions_width?: number | null;
  dimensions_height?: number | null;
  owner_username?: string | null;
  owner_full_name?: string | null;
  hashtags?: string[] | null;
  mentions?: string[] | null;
  music_name?: string | null;
  music_author?: string | null;
  raw?: Record<string, unknown>;
}

interface MappedResult {
  update: PostUpdate;
  raw: Record<string, unknown>;
  thumbnailCdn: string | null;
  videoTitle?: string | null;
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
function toStrArr(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const out: string[] = [];
  for (const x of v) {
    if (typeof x === "string" && x.length > 0) out.push(x);
    else if (x && typeof x === "object" && typeof (x as { name?: unknown }).name === "string") out.push((x as { name: string }).name);
  }
  return out.length > 0 ? out : null;
}

async function scrapeInstagram(sourceUrl: string): Promise<MappedResult> {
  if (!APIFY_TOKEN_INSTAGRAM) throw new Error("APIFY_API_KEY (or APIFY_API_KEY_INSTAGRAM) not configured");
  const items = await callApify("apify~instagram-scraper", APIFY_TOKEN_INSTAGRAM, {
    directUrls: [sourceUrl],
    resultsType: "details",
    resultsLimit: 1,
    addParentData: false,
  });
  const post = items?.[0] as Record<string, unknown> | undefined;
  if (!post || (typeof post.error === "string" && post.error)) {
    throw new Error(typeof post?.error === "string" ? post.error : "Apify returned no posts (URL may be private/deleted)");
  }
  const update: PostUpdate = {};
  const shortCode = str(post.shortCode);
  if (shortCode) update.apify_short_code = shortCode;
  const caption = str(post.caption);
  if (caption) update.caption = caption;
  const cdn = str(post.displayUrl);
  update.thumbnail_cdn_url = cdn ?? null;
  const likes = num(post.likesCount);
  if (likes !== null) update.likes = likes;
  const comments = num(post.commentsCount);
  if (comments !== null) update.comments = comments;
  const views = num(post.videoPlayCount) ?? num(post.videoViewCount);
  if (views !== null) update.views_total = views;
  const posted = parseDate(post.timestamp);
  if (posted) update.posted_at = posted;
  const duration = num(post.videoDuration);
  if (duration !== null) update.video_duration = duration;
  const width = num(post.dimensionsWidth);
  if (width !== null) update.dimensions_width = width;
  const height = num(post.dimensionsHeight);
  if (height !== null) update.dimensions_height = height;
  update.owner_username = str(post.ownerUsername);
  update.owner_full_name = str(post.ownerFullName);
  update.hashtags = toStrArr(post.hashtags);
  update.mentions = toStrArr(post.mentions);
  const music = post.musicInfo as Record<string, unknown> | undefined;
  update.music_name = str(music?.song_name) ?? str(music?.musicName);
  update.music_author = str(music?.artist_name) ?? str(music?.musicAuthor);
  return { update, raw: post, thumbnailCdn: cdn };
}

async function scrapeYouTube(sourceUrl: string): Promise<MappedResult> {
  if (!APIFY_TOKEN_YOUTUBE) throw new Error("APIFY_API_KEY (or APIFY_API_KEY_YOUTUBE) not configured");
  const items = await callApify("streamers~youtube-scraper", APIFY_TOKEN_YOUTUBE, {
    startUrls: [{ url: sourceUrl }],
    maxResults: 1,
    maxResultsShorts: 1,
    maxResultStreams: 0,
    subtitles: true, // v6: bring auto-generated subtitles for transcript fallback
  });
  const v = items?.[0] as Record<string, unknown> | undefined;
  if (!v) throw new Error("YouTube scraper returned no video");
  const update: PostUpdate = {};
  const id = str(v.id);
  if (id) update.apify_short_code = id;
  const text = str(v.text);
  if (text) update.caption = text;
  const cdn = str(v.thumbnailUrl);
  update.thumbnail_cdn_url = cdn ?? null;
  const likes = num(v.likes);
  if (likes !== null) update.likes = likes;
  const comments = num(v.commentsCount);
  if (comments !== null) update.comments = comments;
  const views = num(v.viewCount);
  if (views !== null) update.views_total = views;
  const posted = parseDate(v.date);
  if (posted) update.posted_at = posted;
  const duration = parseHmsToSeconds(v.duration);
  if (duration !== null) update.video_duration = duration;
  update.owner_username = str(v.channelName);
  update.owner_full_name = str(v.channelName);
  return { update, raw: v, thumbnailCdn: cdn, videoTitle: str(v.title) ?? undefined };
}

async function scrapeTikTok(sourceUrl: string): Promise<MappedResult> {
  if (!APIFY_TOKEN_TIKTOK) throw new Error("APIFY_API_KEY (or APIFY_API_KEY_TIKTOK) not configured");
  const items = await callApify("clockworks~tiktok-scraper", APIFY_TOKEN_TIKTOK, {
    postURLs: [sourceUrl],
    resultsPerPage: 1,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
    shouldDownloadSubtitles: false,
    shouldDownloadSlideshowImages: false,
    shouldDownloadAvatars: false,
    shouldDownloadMusicCovers: false,
  });
  const post = items?.[0] as Record<string, unknown> | undefined;
  if (!post) throw new Error("TikTok scraper returned no post");
  const update: PostUpdate = {};
  const id = str(post.id);
  if (id) update.apify_short_code = id;
  const text = str(post.text);
  if (text) update.caption = text;
  const videoMeta = post.videoMeta as Record<string, unknown> | undefined;
  const covers = post.covers as Record<string, unknown> | undefined;
  const cdn =
    str(videoMeta?.coverUrl) ||
    str(videoMeta?.originalCoverUrl) ||
    str(covers?.origin) ||
    str(covers?.default);
  update.thumbnail_cdn_url = cdn ?? null;
  const likes = num(post.diggCount);
  if (likes !== null) update.likes = likes;
  const comments = num(post.commentCount);
  if (comments !== null) update.comments = comments;
  const shares = num(post.shareCount);
  if (shares !== null) update.shares = shares;
  const saves = num(post.collectCount);
  if (saves !== null) update.saves = saves;
  const views = num(post.playCount);
  if (views !== null) update.views_total = views;
  const posted = parseDate(post.createTimeISO);
  if (posted) update.posted_at = posted;
  const duration = num(videoMeta?.duration);
  if (duration !== null) update.video_duration = duration;
  const width = num(videoMeta?.width);
  if (width !== null) update.dimensions_width = width;
  const height = num(videoMeta?.height);
  if (height !== null) update.dimensions_height = height;
  const author = post.authorMeta as Record<string, unknown> | undefined;
  update.owner_username = str(author?.name);
  update.owner_full_name = str(author?.nickName);
  update.hashtags = toStrArr(post.hashtags);
  update.mentions = toStrArr(post.mentions);
  const music = post.musicMeta as Record<string, unknown> | undefined;
  update.music_name = str(music?.musicName);
  update.music_author = str(music?.musicAuthor);
  return { update, raw: post, thumbnailCdn: cdn };
}

async function uploadThumbnailToBucket(
  service: SupabaseClient,
  ownerId: string,
  videoPostId: string,
  cdnUrl: string
): Promise<{ publicUrl: string; storagePath: string } | null> {
  try {
    const res = await fetch(cdnUrl);
    if (!res.ok) {
      console.warn(`Thumbnail download failed (${res.status}) — keeping CDN URL`);
      return null;
    }
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const blob = await res.blob();
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const path = `${ownerId}/${videoPostId}.${ext}`;
    const { error: upErr } = await service.storage.from(BUCKET).upload(path, blob, {
      contentType,
      upsert: true,
    });
    if (upErr) {
      console.warn("Thumbnail upload failed:", upErr.message);
      return null;
    }
    const { data: pub } = service.storage.from(BUCKET).getPublicUrl(path);
    return { publicUrl: pub.publicUrl, storagePath: path };
  } catch (err) {
    console.warn("uploadThumbnailToBucket exception:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization" }, 401);

    // Service-role callers (e.g. analyze-clips-tick) bypass getUser and use the
    // service client for DB ops (RLS bypassed). User callers keep the original
    // RLS-scoped path unchanged.
    const isService = authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const db = isService ? service : userClient;

    let userId: string | null = null;
    if (!isService) {
      const { data: { user }, error: userErr } = await userClient.auth.getUser();
      if (userErr || !user) return json({ error: "Unauthenticated" }, 401);
      userId = user.id;
    }

    const body = await req.json().catch(() => ({}));
    const video_post_id = typeof body?.video_post_id === "string" ? body.video_post_id : null;
    const legacy_video_id = typeof body?.video_id === "string" ? body.video_id : null;
    if (!video_post_id && !legacy_video_id) return json({ error: "video_post_id required" }, 400);

    let post: { id: string; video_id: string; source_url: string; platform: Platform } | null = null;
    if (video_post_id) {
      const { data, error } = await db
        .from("video_posts")
        .select("id, video_id, source_url, platform")
        .eq("id", video_post_id)
        .single();
      if (error || !data) return json({ error: error?.message ?? "video_post not found" }, 404);
      post = data as { id: string; video_id: string; source_url: string; platform: Platform };
    } else if (legacy_video_id) {
      const { data, error } = await db
        .from("video_posts")
        .select("id, video_id, source_url, platform")
        .eq("video_id", legacy_video_id)
        .in("platform", ["instagram", "youtube", "tiktok"])
        .limit(1)
        .maybeSingle();
      if (error || !data) return json({ error: error?.message ?? "No syncable video_post for that video_id" }, 404);
      post = data as { id: string; video_id: string; source_url: string; platform: Platform };
    }
    if (!post) return json({ error: "Could not resolve video_post" }, 500);

    if (post.platform !== "instagram" && post.platform !== "youtube" && post.platform !== "tiktok") {
      return json({ error: `Platform '${post.platform}' is not supported for sync` }, 400);
    }
    if (!post.source_url) return json({ error: "video_post has no source_url" }, 400);

    // Resolve owner for the thumbnail bucket path (service callers don't have a user).
    let ownerId: string | null = userId;
    if (isService) {
      const { data: vrow } = await db.from("videos").select("owner_id").eq("id", post.video_id).single();
      ownerId = (vrow as { owner_id?: string } | null)?.owner_id ?? null;
    }

    let mapped: MappedResult;
    try {
      if (post.platform === "instagram") mapped = await scrapeInstagram(post.source_url);
      else if (post.platform === "youtube") mapped = await scrapeYouTube(post.source_url);
      else mapped = await scrapeTikTok(post.source_url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await db.from("video_posts")
        .update({ last_scrape_error: msg.slice(0, 500), last_scraped_at: new Date().toISOString() })
        .eq("id", post.id);
      return json({ error: msg }, 502);
    }

    if (mapped.thumbnailCdn && ownerId) {
      const uploaded = await uploadThumbnailToBucket(service, ownerId, post.id, mapped.thumbnailCdn);
      if (uploaded) {
        mapped.update.thumbnail_url = uploaded.publicUrl;
        mapped.update.thumbnail_storage_path = uploaded.storagePath;
      } else {
        mapped.update.thumbnail_url = mapped.thumbnailCdn;
      }
    } else if (mapped.thumbnailCdn) {
      mapped.update.thumbnail_url = mapped.thumbnailCdn;
    }

    const update: Record<string, unknown> = {
      ...mapped.update,
      raw: mapped.raw,
      last_scraped_at: new Date().toISOString(),
      last_scrape_error: null,
    };

    if ("views_total" in mapped.update || "likes" in mapped.update || "comments" in mapped.update || "shares" in mapped.update || "saves" in mapped.update) {
      update.metrics_updated_at = new Date().toISOString();
    }

    const { data: updated, error: uErr } = await db.from("video_posts")
      .update(update)
      .eq("id", post.id)
      .select("id, video_id, views_total, likes, comments, shares, saves, thumbnail_url, last_scraped_at")
      .single();
    if (uErr) return json({ error: `Update failed: ${uErr.message}` }, 500);

    if (mapped.videoTitle) {
      const { data: parent } = await db.from("videos").select("title").eq("id", post.video_id).single();
      if (parent && !parent.title) {
        await db.from("videos").update({ title: mapped.videoTitle }).eq("id", post.video_id);
      }
    }

    const { error: histErr } = await db.from("video_metrics_history").insert({
      video_post_id: post.id,
      views_total: mapped.update.views_total ?? null,
      likes: mapped.update.likes ?? null,
      comments: mapped.update.comments ?? null,
      shares: mapped.update.shares ?? null,
      saves: mapped.update.saves ?? null,
      raw: mapped.raw as unknown as Record<string, unknown>,
    });
    if (histErr) console.error("video_metrics_history insert failed:", histErr.message);

    return json({ ok: true, post: updated, platform: post.platform });
  } catch (err) {
    return json({ error: String(err instanceof Error ? err.message : err) }, 500);
  }
});
