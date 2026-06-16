import { useEffect, useId } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchContentIdeas, type ContentIdeaStatus } from "@/lib/api/contentIdeas";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

export function useContentIdeas(status?: ContentIdeaStatus) {
  const { user } = useSession();
  const qc = useQueryClient();
  // Unique per hook instance so the queue and the nav badge don't collide on a
  // shared channel topic (one unmount would kill the other's sub).
  const channelId = useId();

  const query = useQuery({
    queryKey: ["content-ideas", status ?? "all"],
    queryFn: () => fetchContentIdeas(status),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`content-ideas-realtime:${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "content_ideas", filter: `owner_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["content-ideas"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc, channelId]);

  return query;
}

// Count of pending ideas for the nav badge.
export function usePendingContentIdeasCount() {
  const { data } = useContentIdeas("pending");
  return data?.length ?? 0;
}
