import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const APIFY_TOKEN_GLOBAL = Deno.env.get("APIFY_API_KEY");
const APIFY_TOKEN_INSTAGRAM = APIFY_TOKEN_GLOBAL || Deno.env.get("APIFY_API_KEY_INSTAGRAM");
const APIFY_TOKEN_YOUTUBE = APIFY_TOKEN_GLOBAL || Deno.env.get("APIFY_API_KEY_YOUTUBE");
const APIFY_TOKEN_TIKTOK = APIFY_TOKEN_GLOBAL || Deno.env.get("APIFY_API_KEY_TIKTOK");

const APIFY_BASE = "https://api.apify.com/v2/acts";

// Cross-platform merge tuning
const MERGE_TIME_WINDOW_MS = 72 * 60 * 60 * 1000; // ±72h
const MERGE_JACCARD_MIN = 0.55; // ≥4-token candidates
const MERGE_JACCARD_MIN_SHORT = 0.85; // <4-token candidates need very high overlap
const SHORT_TOKEN_THRESHOLD = 4;

const STOPWORDS_ES_EN = new Set([
  "el","la","los","las","de","del","y","o","a","en","un","una","unos","unas","es","son","que","con","por","para","mi","tu","su","sus","mis","tus","mas","más","menos","si","no","ya","ser","estar","fue","muy","todo","todos","toda","todas",
  "the","a","an","of","and","or","to","in","on","for","with","my","your","is","are","was","were","be","been","this","that","these","those","but","if","not","very","all","so","just",
]);

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
function stripHandle(raw: string): string {
  let h = raw.trim();
  if (h.startsWith("@")) h = h.slice(1);
  const m = h.match(/(?:instagram\.com|tiktok\.com|youtube\.com)\/(?:@)?([^\/?#]+)/i);
  if (m) h = m[1];
  return h.replace(/\/+$/, "");
}

// ============================================================================
// Cross-platform fuzzy matching
// ============================================================================
function normalizeTokens(text: string | null | undefined): string[] {
  if (!text) return [];
  const cleaned = text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[@#]\w+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned
    .split(" ")
    .filter((t) => t.length > 2 && !STOPWORDS_ES_EN.has(t));
}

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const sa = new Set(a);
  const sb = new Set(b);
  let intersect = 0;
  for (const t of sa) if (sb.has(t)) intersect++;
  const union = sa.size + sb.size - intersect;
  return union === 0 ? 0 : intersect / union;
}

interface ExistingVideoSummary {
  video_id: string;
  title: string | null;
  platforms: Set<Platform>;
  // best representative tokens (caption first, fallback to title)
  posts: Array<{ platform: Platform; caption: string | null; posted_at: string | null }>;
}

/**
 * Look up an existing video to merge into. Returns null if no good match.
 * Filters: same owner (by virtue of using userClient with RLS), within time
 * window, doesn't already have a post for this platform, jaccard ≥ threshold.
 */
function findMergeTarget(
  candidate: DiscoveredVideo,
  candidates: ExistingVideoSummary[],
): { video_id: string; score: number } | null {
  const candidateTokens = normalizeTokens(
    candidate.caption ?? candidate.title ?? "",
  );
  if (candidateTokens.length === 0) return null;

  const candidateTime = candidate.posted_at
    ? new Date(candidate.posted_at).getTime()
    : null;
  const minScore =
    candidateTokens.length < SHORT_TOKEN_THRESHOLD
      ? MERGE_JACCARD_MIN_SHORT
      : MERGE_JACCARD_MIN;

  let best: { video_id: string; score: number } | null = null;

  for (const existing of candidates) {
    // Can't merge -- this video already has a post on the candidate's platform
    if (existing.platforms.has(candidate.platform)) continue;

    // Best score across the existing video's posts (any post that matches in
    // both time and text counts)
    let videoBest = 0;

    for (const post of existing.posts) {
      // Time check
      if (candidateTime && post.posted_at) {
        const dt = Math.abs(
          candidateTime - new Date(post.posted_at).getTime(),
        );
        if (dt > MERGE_TIME_WINDOW_MS) continue;
      }
      const existingText = post.caption ?? existing.title ?? "";
      const existingTokens = normalizeTokens(existingText);
      const score = jaccard(candidateTokens, existingTokens);
      if (score > videoBest) videoBest = score;
    }

    // Also try matching against the parent video title (for YT-style title-only)
    if (existing.title) {
      const titleScore = jaccard(
        candidateTokens,
        normalizeTokens(existing.title),
      );
      if (titleScore > videoBest) videoBest = titleScore;
    }

    if (videoBest >= minScore && (!best || videoBest > best.score)) {
      best = { video_id: existing.video_id, score: videoBest };
    }
  }

  return best;
}

// ============================================================================
// Apify scrapers (unchanged)
// ============================================================================
async function discoverInstagram(handleRaw: string, sinceMs: number): Promise<DiscoveredVideo[]> {
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
    if (ts && new Date(ts).getTime() < sinceMs) continue;
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
      video_duration: num(post.videoDuration),
      raw: post,
    });
  }
  return out;
}

async function discoverYouTube(handleRaw: string, sinceMs: number): Promise<DiscoveredVideo[]> {
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
    subtitles: false,
  });
  const out: DiscoveredVideo[] = [];
  for (const it of items) {
    const v = it as Record<string, unknown>;
    const id = str(v.id);
    const u = str(v.url);
    if (!id || !u) continue;
    const ts = parseDate(v.date);
    if (ts && new Date(ts).getTime() < sinceMs) continue;
    out.push({
      platform: "youtube",
      source_url: u,
      apify_short_code: id,
      posted_at: ts,
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

async function discoverTikTok(handleRaw: string, sinceMs: number): Promise<DiscoveredVideo[]> {
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
    const ts = parseDate(post.createTimeISO);
    if (ts && new Date(ts).getTime() < sinceMs) continue;
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
      posted_at: ts,
      title: null,
      caption: str(post.text),
      thumbnail_url: thumb,
      views_total: num(post.playCount),
      likes: num(post.diggCount),
      comments: num(post.commentCount),
      shares: num(post.shareCount),
      saves: num(post.collectCount),
      video_duration: num(videoMeta?.duration),
      raw: post,
    });
  }
  return out;
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
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const days = typeof body?.days === "number" && body.days > 0 ? body.days : 7;
    const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;

    const { data: profile, error: pErr } = await userClient
      .from("profiles")
      .select("instagram_handle, youtube_handle, tiktok_handle")
      .eq("id", user.id)
      .single();
    if (pErr || !profile) return json({ error: pErr?.message ?? "Profile not found" }, 404);

    const ig = str(profile.instagram_handle);
    const yt = str(profile.youtube_handle);
    const tt = str(profile.tiktok_handle);
    if (!ig && !yt && !tt) {
      return json({ error: "No social handles configured. Set instagram_handle, youtube_handle and/or tiktok_handle in your profile." }, 400);
    }

    const tasks: Promise<{ platform: Platform; items?: DiscoveredVideo[]; error?: string }>[] = [];
    if (ig) tasks.push(discoverInstagram(ig, sinceMs).then((items) => ({ platform: "instagram" as const, items })).catch((e) => ({ platform: "instagram" as const, error: e instanceof Error ? e.message : String(e) })));
    if (yt) tasks.push(discoverYouTube(yt, sinceMs).then((items) => ({ platform: "youtube" as const, items })).catch((e) => ({ platform: "youtube" as const, error: e instanceof Error ? e.message : String(e) })));
    if (tt) tasks.push(discoverTikTok(tt, sinceMs).then((items) => ({ platform: "tiktok" as const, items })).catch((e) => ({ platform: "tiktok" as const, error: e instanceof Error ? e.message : String(e) })));

    const results = await Promise.all(tasks);
    const errors: { platform: string; error: string }[] = [];
    const allDiscovered: DiscoveredVideo[] = [];
    for (const r of results) {
      if (r.error) errors.push({ platform: r.platform, error: r.error });
      else if (r.items) allDiscovered.push(...r.items);
    }

    if (allDiscovered.length === 0) {
      return json({ ok: true, imported: 0, merged: 0, skipped: 0, errors, discovered: 0, matches: [] });
    }

    // 1) Dedupe against existing video_posts (exact match by short_code or url)
    const shortCodes = allDiscovered.map((v) => v.apify_short_code);
    const sourceUrls = allDiscovered.map((v) => v.source_url);
    const { data: existing } = await userClient
      .from("video_posts")
      .select("apify_short_code, source_url, video_id, videos!inner(owner_id)")
      .eq("videos.owner_id", user.id)
      .or(
        `apify_short_code.in.(${shortCodes.map((s) => `"${s}"`).join(",")}),source_url.in.(${sourceUrls.map((s) => `"${s}"`).join(",")})`,
      );
    const existingShortCodes = new Set((existing ?? []).map((r) => r.apify_short_code).filter(Boolean) as string[]);
    const existingUrls = new Set((existing ?? []).map((r) => r.source_url).filter(Boolean) as string[]);

    const toImport = allDiscovered.filter(
      (v) => !existingShortCodes.has(v.apify_short_code) && !existingUrls.has(v.source_url),
    );
    const skipped = allDiscovered.length - toImport.length;

    if (toImport.length === 0) {
      return json({ ok: true, imported: 0, merged: 0, skipped, errors, discovered: allDiscovered.length, matches: [] });
    }

    // 2) Pre-load existing videos in the time window for cross-platform fuzzy matching.
    // Window covers all candidates ±MERGE_TIME_WINDOW_MS.
    const candidateTimes = toImport
      .map((v) => v.posted_at)
      .filter((t): t is string => !!t)
      .map((t) => new Date(t).getTime());
    const windowStart =
      candidateTimes.length > 0
        ? new Date(Math.min(...candidateTimes) - MERGE_TIME_WINDOW_MS).toISOString()
        : null;
    const windowEnd =
      candidateTimes.length > 0
        ? new Date(Math.max(...candidateTimes) + MERGE_TIME_WINDOW_MS).toISOString()
        : null;

    const mergeCandidates: ExistingVideoSummary[] = [];
    if (windowStart && windowEnd) {
      const { data: existingPosts } = await userClient
        .from("video_posts")
        .select("video_id, platform, caption, posted_at, videos!inner(owner_id, title)")
        .eq("videos.owner_id", user.id)
        .gte("posted_at", windowStart)
        .lte("posted_at", windowEnd);

      // Group by video_id
      const grouped = new Map<string, ExistingVideoSummary>();
      for (const row of (existingPosts ?? []) as Array<{
        video_id: string;
        platform: Platform;
        caption: string | null;
        posted_at: string | null;
        videos: { owner_id: string; title: string | null } | { owner_id: string; title: string | null }[];
      }>) {
        const videos = Array.isArray(row.videos) ? row.videos[0] : row.videos;
        if (!grouped.has(row.video_id)) {
          grouped.set(row.video_id, {
            video_id: row.video_id,
            title: videos?.title ?? null,
            platforms: new Set<Platform>(),
            posts: [],
          });
        }
        const summary = grouped.get(row.video_id)!;
        summary.platforms.add(row.platform);
        summary.posts.push({
          platform: row.platform,
          caption: row.caption,
          posted_at: row.posted_at,
        });
      }
      mergeCandidates.push(...grouped.values());
    }

    // 3) For each candidate: try to merge first (cross-platform), else create new video.
    // Process in posted_at order so cross-batch matching (IG → TT → YT for the same content)
    // works -- the IG insert seeds the merge candidate that TT/YT will match against.
    const sorted = [...toImport].sort((a, b) => {
      const ta = a.posted_at ? new Date(a.posted_at).getTime() : 0;
      const tb = b.posted_at ? new Date(b.posted_at).getTime() : 0;
      return ta - tb;
    });

    const nowIso = new Date().toISOString();
    let imported = 0;
    let merged = 0;
    const matches: { source_url: string; merged_into: string; score: number }[] = [];

    for (const v of sorted) {
      const target = findMergeTarget(v, mergeCandidates);
      let videoId: string;

      if (target) {
        // Merge: reuse the existing video row, just add a post.
        videoId = target.video_id;
        merged++;
        matches.push({
          source_url: v.source_url,
          merged_into: videoId,
          score: Number(target.score.toFixed(3)),
        });
        // Mark that this video now has a post on this platform (for subsequent
        // candidates in the same batch).
        const summary = mergeCandidates.find((c) => c.video_id === videoId);
        if (summary) summary.platforms.add(v.platform);
      } else {
        // Create a new videos row.
        const { data: video, error: vErr } = await userClient
          .from("videos")
          .insert({ owner_id: user.id, title: v.title })
          .select("id")
          .single();
        if (vErr || !video) {
          errors.push({ platform: v.platform, error: `Insert videos failed: ${vErr?.message ?? "unknown"}` });
          continue;
        }
        videoId = video.id;
        // Seed the merge-candidate map so later candidates in this batch can
        // attach to the brand-new video.
        mergeCandidates.push({
          video_id: videoId,
          title: v.title,
          platforms: new Set<Platform>([v.platform]),
          posts: [{ platform: v.platform, caption: v.caption, posted_at: v.posted_at }],
        });
      }

      // Insert the post row
      const { data: post, error: pErr2 } = await userClient
        .from("video_posts")
        .insert({
          video_id: videoId,
          platform: v.platform,
          source_url: v.source_url,
          apify_short_code: v.apify_short_code,
          posted_at: v.posted_at,
          caption: v.caption,
          thumbnail_url: v.thumbnail_url,
          thumbnail_cdn_url: v.thumbnail_url,
          views_total: v.views_total,
          likes: v.likes,
          comments: v.comments,
          shares: v.shares,
          saves: v.saves,
          video_duration: v.video_duration,
          last_scraped_at: nowIso,
          metrics_updated_at: nowIso,
          raw: v.raw as unknown as Record<string, unknown>,
        })
        .select("id")
        .single();

      if (pErr2 || !post) {
        errors.push({ platform: v.platform, error: `Insert video_posts failed: ${pErr2?.message ?? "unknown"}` });
        // If we just created the video and the post failed, roll back the orphan video.
        if (!target) {
          await userClient.from("videos").delete().eq("id", videoId);
          // Also remove from merge candidates so future iterations don't try to use it
          const idx = mergeCandidates.findIndex((c) => c.video_id === videoId);
          if (idx >= 0) mergeCandidates.splice(idx, 1);
        }
        continue;
      }

      // If this insert added a NEW platform to an EXISTING video and that video
      // had no title yet, propagate the title (helpful for YT additions to
      // previously caption-only IG/TT videos).
      if (target && v.title) {
        const summary = mergeCandidates.find((c) => c.video_id === videoId);
        if (summary && !summary.title) {
          summary.title = v.title;
          await userClient
            .from("videos")
            .update({ title: v.title })
            .eq("id", videoId)
            .is("title", null);
        }
      }

      // Snapshot history (best-effort)
      await userClient.from("video_metrics_history").insert({
        video_post_id: post.id,
        views_total: v.views_total,
        likes: v.likes,
        comments: v.comments,
        shares: v.shares,
        saves: v.saves,
        raw: v.raw as unknown as Record<string, unknown>,
      });

      if (!target) imported++;
    }

    return json({
      ok: true,
      imported,
      merged,
      skipped,
      errors,
      discovered: allDiscovered.length,
      matches,
    });
  } catch (err) {
    return json({ error: String(err instanceof Error ? err.message : err) }, 500);
  }
});
