import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";
import type { ScriptWithBrolls } from "@/lib/api/scripts";

// ────────────────────────────────────────────────────────────────────────────
// Core types
// ────────────────────────────────────────────────────────────────────────────

export type Video = Tables<"videos">;
export type VideoInsert = TablesInsert<"videos">;
export type VideoUpdate = TablesUpdate<"videos">;

export type VideoPost = Tables<"video_posts">;
export type VideoPostInsert = TablesInsert<"video_posts">;
export type VideoPostUpdate = TablesUpdate<"video_posts">;

export type VideoPlatform = "instagram" | "youtube" | "tiktok" | "other";
export type PerformanceTier = "normal" | "3x" | "5x" | "outlier";

export const PLATFORM_LABEL: Record<VideoPlatform, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  other: "Otra",
};

export const TIER_LABEL: Record<PerformanceTier, string> = {
  normal: "Normal",
  "3x": "3×",
  "5x": "5×",
  outlier: "Outlier",
};

export const SYNCABLE_PLATFORMS: ReadonlyArray<VideoPlatform> = ["instagram", "youtube", "tiktok"];

export function isSyncable(platform: string | null | undefined): platform is VideoPlatform {
  return platform != null && (SYNCABLE_PLATFORMS as ReadonlyArray<string>).includes(platform);
}

export interface VideoWithPosts extends Video {
  posts: VideoPost[];
  formats: { id: string; name: string } | null;
  scripts: ScriptWithBrolls | null;
}

export interface VideoFilters {
  platform?: VideoPlatform;
  format_id?: string;
  performance_tier?: PerformanceTier;
  sort?: "posted_at_desc" | "views_desc" | "multiplier_desc";
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

export function detectPlatform(url: string): VideoPlatform | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    const host = u.hostname.toLowerCase();
    if (host.includes("instagram")) return "instagram";
    if (host.includes("youtube") || host.includes("youtu.be")) return "youtube";
    if (host.includes("tiktok")) return "tiktok";
    return "other";
  } catch {
    return null;
  }
}

/**
 * The "primary" post of a video — used for derived properties (latest sync time, default thumbnail, etc).
 * Defined as: most recently scraped, or the most recent posted_at, or the first.
 */
export function primaryPost(posts: VideoPost[]): VideoPost | null {
  if (posts.length === 0) return null;
  const scraped = [...posts].sort((a, b) => {
    const ta = a.last_scraped_at ? Date.parse(a.last_scraped_at) : 0;
    const tb = b.last_scraped_at ? Date.parse(b.last_scraped_at) : 0;
    return tb - ta;
  });
  return scraped[0];
}

export function postByPlatform(posts: VideoPost[], platform: VideoPlatform): VideoPost | null {
  return posts.find((p) => p.platform === platform) ?? null;
}

/**
 * The post to play for a video, preferring Instagram → YouTube → TikTok and
 * requiring an embeddable short code. Falls back to any embeddable post, else null.
 */
const PLAY_PREFERENCE: VideoPlatform[] = ["instagram", "youtube", "tiktok"];
export function playablePost(posts: VideoPost[]): VideoPost | null {
  const embeddable = (p: VideoPost) => isSyncable(p.platform) && !!p.apify_short_code;
  for (const platform of PLAY_PREFERENCE) {
    const p = posts.find((x) => x.platform === platform && embeddable(x));
    if (p) return p;
  }
  return posts.find(embeddable) ?? null;
}

export function platformsPresent(posts: VideoPost[]): VideoPlatform[] {
  return posts.map((p) => p.platform as VideoPlatform);
}

// ────────────────────────────────────────────────────────────────────────────
// Queries
// ────────────────────────────────────────────────────────────────────────────

export async function fetchVideos(filters: VideoFilters = {}): Promise<VideoWithPosts[]> {
  let query = supabase
    .from("videos")
    .select("*, posts:video_posts(*), formats(id, name)");

  if (filters.format_id) query = query.eq("format_id", filters.format_id);
  if (filters.performance_tier) query = query.eq("performance_tier", filters.performance_tier);

  switch (filters.sort) {
    case "views_desc":
      query = query.order("views_total_aggregate", { ascending: false, nullsFirst: false });
      break;
    case "multiplier_desc":
      query = query.order("multiplier", { ascending: false, nullsFirst: false });
      break;
    case "posted_at_desc":
    default:
      query = query.order("created_at", { ascending: false, nullsFirst: false });
  }

  const { data, error } = await query;
  if (error) throw error;
  let rows = (data ?? []) as unknown as VideoWithPosts[];

  // Client-side platform filter (applied to posts join)
  if (filters.platform) {
    rows = rows.filter((v) => v.posts.some((p) => p.platform === filters.platform));
  }

  return rows;
}

export async function fetchVideo(id: string): Promise<VideoWithPosts | null> {
  const { data, error } = await supabase
    .from("videos")
    .select("*, posts:video_posts(*), formats(id, name), scripts(*, broll_suggestions(*))")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as VideoWithPosts;
  if (row.scripts) {
    row.scripts.broll_suggestions = (row.scripts.broll_suggestions ?? []).slice().sort((a, b) => a.position - b.position);
  }
  // Stable order for posts: instagram, youtube, tiktok, other
  const order: Record<VideoPlatform, number> = { instagram: 0, youtube: 1, tiktok: 2, other: 3 };
  row.posts = (row.posts ?? []).slice().sort((a, b) => order[a.platform as VideoPlatform] - order[b.platform as VideoPlatform]);
  return row;
}

// ────────────────────────────────────────────────────────────────────────────
// Mutations
// ────────────────────────────────────────────────────────────────────────────

/**
 * Create a logical video together with its first platform post.
 * source_url is required; platform is auto-detected if not passed.
 */
export interface CreateVideoWithPostInput {
  owner_id: string;
  source_url: string;
  source_platform?: VideoPlatform;
  posted_at?: string | null;
  title?: string | null;
  caption?: string | null;
  thumbnail_url?: string | null;
  format_id?: string | null;
  script_id?: string | null;
  notes?: string | null;
  views_total?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  views_organic?: number | null;
  views_paid?: number | null;
  watch_time_seconds?: number | null;
  retention_pct?: number | null;
  reach?: number | null;
  spend?: number | null;
}

export async function createVideoWithPost(input: CreateVideoWithPostInput): Promise<{ video: Video; post: VideoPost }> {
  const platform = input.source_platform ?? detectPlatform(input.source_url) ?? "other";

  const { data: video, error: vErr } = await supabase
    .from("videos")
    .insert({
      owner_id: input.owner_id,
      title: input.title ?? null,
      notes: input.notes ?? null,
      format_id: input.format_id ?? null,
      script_id: input.script_id ?? null,
    })
    .select()
    .single();
  if (vErr || !video) throw vErr ?? new Error("Insert into videos failed");

  const { data: post, error: pErr } = await supabase
    .from("video_posts")
    .insert({
      video_id: video.id,
      platform,
      source_url: input.source_url.trim(),
      posted_at: input.posted_at ?? null,
      caption: input.caption ?? null,
      thumbnail_url: input.thumbnail_url ?? null,
      views_total: input.views_total ?? null,
      likes: input.likes ?? null,
      comments: input.comments ?? null,
      shares: input.shares ?? null,
      saves: input.saves ?? null,
      views_organic: input.views_organic ?? null,
      views_paid: input.views_paid ?? null,
      watch_time_seconds: input.watch_time_seconds ?? null,
      retention_pct: input.retention_pct ?? null,
      reach: input.reach ?? null,
      spend: input.spend ?? null,
    })
    .select()
    .single();
  if (pErr || !post) {
    // Best-effort cleanup: remove the orphan video
    await supabase.from("videos").delete().eq("id", video.id);
    throw pErr ?? new Error("Insert into video_posts failed");
  }

  return { video, post };
}

export async function updateVideo(id: string, input: VideoUpdate): Promise<Video> {
  const { data, error } = await supabase
    .from("videos")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateVideoPost(id: string, input: VideoPostUpdate): Promise<VideoPost> {
  const { data, error } = await supabase
    .from("video_posts")
    .update({ ...input, metrics_updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteVideo(id: string): Promise<void> {
  const { error } = await supabase.from("videos").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteVideoPost(id: string): Promise<void> {
  const { error } = await supabase.from("video_posts").delete().eq("id", id);
  if (error) throw error;
}

// ────────────────────────────────────────────────────────────────────────────
// Edge function helpers
// ────────────────────────────────────────────────────────────────────────────

export interface SyncVideoPostResult {
  id: string;
  video_id: string;
  views_total: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  thumbnail_url: string | null;
  last_scraped_at: string | null;
}

async function unwrapError<T>(error: unknown): Promise<T> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as { error?: string };
      if (body?.error) throw new Error(body.error);
    } catch (jsonErr) {
      if (jsonErr instanceof Error && jsonErr.message) throw jsonErr;
    }
  }
  throw new Error(error instanceof Error ? error.message : String(error));
}

export async function syncVideoPost(video_post_id: string): Promise<SyncVideoPostResult> {
  const { data, error } = await supabase.functions.invoke<
    { ok: true; post: SyncVideoPostResult } | { error: string }
  >("scrape-video", { body: { video_post_id } });
  if (error) await unwrapError(error);
  if (!data) throw new Error("Empty response from scrape-video");
  if ("error" in data) throw new Error(data.error);
  return data.post;
}

export interface DiscoverImportResult {
  ok: true;
  imported: number;
  /** Posts attached to an existing video via cross-platform fuzzy match. */
  merged: number;
  skipped: number;
  discovered: number;
  errors: { platform: string; error: string }[];
  /** Per-merge audit trail — useful if a false positive happens. */
  matches: { source_url: string; merged_into: string; score: number }[];
}

export async function discoverAndImportVideos(days = 7): Promise<DiscoverImportResult> {
  const { data, error } = await supabase.functions.invoke<DiscoverImportResult | { error: string }>(
    "discover-and-import-videos",
    { body: { days } },
  );
  if (error) await unwrapError(error);
  if (!data) throw new Error("Empty response from discover-and-import-videos");
  if ("error" in data) throw new Error(data.error);
  return data;
}

export interface SyncVideosResult {
  ok: boolean;
  /** New logical videos created. */
  imported: number;
  /** Fragmented duplicates consolidated into a single video. */
  merged: number;
  /** Platform posts refreshed (metrics updated). */
  synced: number;
  /** Logical videos processed. */
  videos: number;
  /** Total (post × platform) entries seen on Zernio. */
  discovered: number;
  errors: string[];
}

/**
 * Sync every video + metrics natively from Zernio (IG/YT/TikTok official APIs),
 * grouping cross-posts into one logical video. Replaces the Apify discovery.
 */
export async function syncVideosFromZernio(): Promise<SyncVideosResult> {
  const { data, error } = await supabase.functions.invoke<SyncVideosResult | { error: string }>(
    "sync-videos-zernio",
    { body: {} },
  );
  if (error) await unwrapError(error);
  if (!data) throw new Error("Empty response from sync-videos-zernio");
  if ("error" in data) throw new Error(data.error);
  return data;
}

export interface TranscribeVideoResult {
  ok: true;
  video_id: string;
  transcript: string;
  language: string | null;
}

export async function transcribeVideo(video_id: string): Promise<TranscribeVideoResult> {
  const { data, error } = await supabase.functions.invoke<TranscribeVideoResult | { error: string }>(
    "transcribe-video",
    { body: { video_id } },
  );
  if (error) await unwrapError(error);
  if (!data) throw new Error("Empty response from transcribe-video");
  if ("error" in data) throw new Error(data.error);
  return data;
}

export interface LinkPlatformResult {
  ok: true;
  video_id: string;
  post: VideoPost;
}

export async function linkVideoPlatform(video_id: string, source_url: string): Promise<LinkPlatformResult> {
  const { data, error } = await supabase.functions.invoke<LinkPlatformResult | { error: string }>(
    "link-video-platform",
    { body: { video_id, source_url } },
  );
  if (error) await unwrapError(error);
  if (!data) throw new Error("Empty response from link-video-platform");
  if ("error" in data) throw new Error(data.error);
  return data;
}
