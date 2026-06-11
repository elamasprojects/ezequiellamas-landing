import { useEffect, useId } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchEngagementReplies,
  fetchEngagementSettings,
  type EngagementReplyStatus,
} from "@/lib/api/engagement";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

export function useEngagementSettings() {
  return useQuery({
    queryKey: ["engagement-settings"],
    queryFn: fetchEngagementSettings,
    staleTime: 60_000,
  });
}

export function useEngagementReplies(status?: EngagementReplyStatus) {
  const { user } = useSession();
  const qc = useQueryClient();
  const channelId = useId();

  const query = useQuery({
    queryKey: ["engagement-replies", status ?? "all"],
    queryFn: () => fetchEngagementReplies(status),
    enabled: !!user?.id,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`engagement-replies:${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "engagement_replies", filter: `owner_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["engagement-replies"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc, channelId]);

  return query;
}

export function usePendingEngagementCount() {
  const { data } = useEngagementReplies("pending");
  return data?.length ?? 0;
}
