import { supabase } from "@/lib/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";
import type { ScriptWithBrolls } from "@/lib/api/scripts";

export type Video = Tables<"videos">;
export type VideoInsert = TablesInsert<"videos">;
export type VideoUpdate = TablesUpdate<"videos">;

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

export interface VideoWithLinks extends Video {
  formats: { id: string; name: string } | null;
  scripts: ScriptWithBrolls | null;
}

export interface VideoFilters {
  platform?: VideoPlatform;
  format_id?: string;
  performance_tier?: PerformanceTier;
  sort?: "posted_at_desc" | "views_desc" | "multiplier_desc";
}

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

export async function fetchVideos(filters: VideoFilters = {}): Promise<Video[]> {
  let query = supabase.from("videos").select("*, formats(id, name)");

  if (filters.platform) query = query.eq("source_platform", filters.platform);
  if (filters.format_id) query = query.eq("format_id", filters.format_id);
  if (filters.performance_tier) query = query.eq("performance_tier", filters.performance_tier);

  switch (filters.sort) {
    case "views_desc":
      query = query.order("views_total", { ascending: false, nullsFirst: false });
      break;
    case "multiplier_desc":
      query = query.order("multiplier", { ascending: false, nullsFirst: false });
      break;
    case "posted_at_desc":
    default:
      query = query.order("posted_at", { ascending: false, nullsFirst: false });
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Video[];
}

export async function fetchVideo(id: string): Promise<VideoWithLinks | null> {
  const { data, error } = await supabase
    .from("videos")
    .select("*, formats(id, name), scripts(*, broll_suggestions(*))")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  // Sort brolls of the linked script
  const scripts = data.scripts as ScriptWithBrolls | null;
  if (scripts) {
    scripts.broll_suggestions = (scripts.broll_suggestions ?? []).slice().sort((a, b) => a.position - b.position);
  }
  return data as unknown as VideoWithLinks;
}

export async function createVideo(input: VideoInsert): Promise<Video> {
  const { data, error } = await supabase.from("videos").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateVideo(id: string, input: VideoUpdate): Promise<Video> {
  const { data, error } = await supabase
    .from("videos")
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

export interface SyncVideoResult {
  id: string;
  views_total: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  multiplier: number | null;
  performance_tier: PerformanceTier | null;
  last_scraped_at: string | null;
}

export const SYNCABLE_PLATFORMS: ReadonlyArray<VideoPlatform> = ["instagram", "youtube", "tiktok"];

export function isSyncable(platform: string | null | undefined): platform is VideoPlatform {
  return platform != null && (SYNCABLE_PLATFORMS as ReadonlyArray<string>).includes(platform);
}

export async function syncVideoMetrics(video_id: string): Promise<SyncVideoResult> {
  const { data, error } = await supabase.functions.invoke<
    { ok: true; video: SyncVideoResult; platform: VideoPlatform } | { error: string }
  >("scrape-video", { body: { video_id } });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Empty response from scrape-video");
  if ("error" in data) throw new Error(data.error);
  return data.video;
}
