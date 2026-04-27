import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchScheduledPost, type ScheduledPostWithJobs } from "@/lib/api/scheduledPosts";
import { supabase } from "@/lib/supabase";

export function useScheduledPost(id: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery<ScheduledPostWithJobs | null>({
    queryKey: ["scheduled-post", id],
    queryFn: () => fetchScheduledPost(id!),
    enabled: !!id,
    staleTime: 5_000,
  });

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`scheduled-post-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "publish_jobs", filter: `scheduled_post_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["scheduled-post", id] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scheduled_posts", filter: `id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["scheduled-post", id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, qc]);

  return query;
}
