import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchScheduledPosts,
  type ScheduledPostFilters,
  type ScheduledPostWithJobs,
} from "@/lib/api/scheduledPosts";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

export function useScheduledPosts(filters: ScheduledPostFilters = {}) {
  const { user } = useSession();
  const qc = useQueryClient();

  const query = useQuery<ScheduledPostWithJobs[]>({
    queryKey: ["scheduled-posts", user?.id, filters],
    queryFn: () => fetchScheduledPosts(filters),
    enabled: !!user?.id,
    staleTime: 10_000,
  });

  // Realtime: any change to scheduled_posts or publish_jobs invalidates
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("scheduled-posts-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scheduled_posts", filter: `owner_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["scheduled-posts"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "publish_jobs" },
        () => {
          qc.invalidateQueries({ queryKey: ["scheduled-posts"] });
          qc.invalidateQueries({ queryKey: ["scheduled-post"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);

  return query;
}
