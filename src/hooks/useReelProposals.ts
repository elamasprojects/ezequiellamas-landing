import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchReelProposals, type ReelProposalStatus } from "@/lib/api/reelProposals";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

export function useReelProposals(status?: ReelProposalStatus) {
  const { user } = useSession();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["reel-proposals", status ?? "all"],
    queryFn: () => fetchReelProposals(status),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("reel-proposals-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reel_proposals", filter: `owner_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["reel-proposals"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);

  return query;
}

// Count of pending proposals for the nav badge.
export function usePendingReelProposalsCount() {
  const { data } = useReelProposals("pending");
  return data?.length ?? 0;
}
