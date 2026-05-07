import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface BunnyVideoRow {
  id: string;
  bunny_video_id: string;
  bunny_library_id: string;
  title: string | null;
  filename: string | null;
  status: "uploading" | "encoding" | "ready" | "failed";
  duration_seconds: number | null;
  thumbnail_url: string | null;
  encode_error: string | null;
  encode_progress: number | null;
  transcript_status: "idle" | "pending" | "done" | "failed" | "too_large";
  created_at: string;
}

async function fetchBunnyVideos(): Promise<BunnyVideoRow[]> {
  const { data, error } = await supabase
    .from("bunny_videos")
    .select(
      "id, bunny_video_id, bunny_library_id, title, filename, status, duration_seconds, thumbnail_url, encode_error, encode_progress, transcript_status, created_at",
    )
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as BunnyVideoRow[];
}

async function refreshAllPending(): Promise<void> {
  await supabase.functions.invoke("bunny-refresh-video", { body: {} });
}

export function useBunnyVideos() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["bunny_videos"],
    queryFn: fetchBunnyVideos,
    staleTime: 10_000,
    refetchOnMount: "always",
  });

  // While there are videos in transit (uploading/encoding), poll the refresh
  // edge function every 8s and re-fetch the local list. Stops automatically
  // once nothing is pending.
  const hasPending = (query.data ?? []).some(
    (v) => v.status === "uploading" || v.status === "encoding",
  );

  useEffect(() => {
    if (!hasPending) return;
    let cancelled = false;
    async function tick() {
      try {
        await refreshAllPending();
        if (!cancelled) qc.invalidateQueries({ queryKey: ["bunny_videos"] });
      } catch {
        // swallow — next tick will retry
      }
    }
    // Fire once immediately, then every 8s
    void tick();
    const id = setInterval(tick, 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [hasPending, qc]);

  return query;
}

export async function refreshOneBunnyVideo(bunnyVideoId: string): Promise<void> {
  const { error } = await supabase.functions.invoke("bunny-refresh-video", {
    body: { bunny_video_id: bunnyVideoId },
  });
  if (error) throw new Error(error.message ?? "refresh_failed");
}
