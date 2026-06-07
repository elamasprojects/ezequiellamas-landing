import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";

export type YoutubeVideo = Tables<"youtube_videos">;

// Safe (token-free) view of the connection for the client.
export interface YoutubeConnectionPublic {
  id: string;
  channel_id: string | null;
  channel_title: string | null;
  channel_thumbnail_url: string | null;
  status: string;
  last_synced_at: string | null;
  last_sync_error: string | null;
}

export async function fetchYoutubeConnection(): Promise<YoutubeConnectionPublic | null> {
  const { data, error } = await supabase
    .from("youtube_connections")
    .select("id, channel_id, channel_title, channel_thumbnail_url, status, last_synced_at, last_sync_error")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchYoutubeVideos(): Promise<YoutubeVideo[]> {
  const { data, error } = await supabase
    .from("youtube_videos")
    .select("*")
    .order("published_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

async function invoke<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T | { error: string }>(fn, { body });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const b = (await ctx.clone().json()) as { error?: string };
        if (b?.error) throw new Error(b.error);
      } catch { /* fall through */ }
    }
    throw new Error(error.message);
  }
  if (!data) throw new Error("Empty response");
  if (typeof data === "object" && data !== null && "error" in data) throw new Error((data as { error: string }).error);
  return data as T;
}

export async function startYoutubeConnect(): Promise<{ url: string; state: string }> {
  return invoke("youtube-connect-start", {});
}

export async function completeYoutubeConnect(code: string, state: string): Promise<{ ok: boolean; channel_title: string | null }> {
  return invoke("youtube-connect-callback", { code, state });
}

export async function syncYoutube(): Promise<{ ok: boolean; synced: number; discovered: number }> {
  return invoke("youtube-sync", {});
}

export async function analyzeYoutubeVideo(rowId: string, force = false): Promise<{ ok: boolean; transcript_status?: string; concept_status?: string }> {
  return invoke("analyze-youtube-video", { youtube_video_row_id: rowId, force });
}
