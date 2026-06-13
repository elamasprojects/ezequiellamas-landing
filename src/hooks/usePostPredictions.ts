import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPredictions, type PostPrediction } from "@/lib/api/predictions";
import { supabase } from "@/lib/supabase";

/**
 * Loads virality predictions for a scheduled post, with realtime invalidation
 * so the UI flips from "predicted" to "evaluated" (predicted-vs-actual) the
 * moment the evaluation tick or an inline scrape writes the actuals.
 */
export function usePostPredictions(id: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery<PostPrediction[]>({
    queryKey: ["post-predictions", id],
    queryFn: () => fetchPredictions(id!),
    enabled: !!id,
    staleTime: 5_000,
  });

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`post-predictions-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_predictions", filter: `scheduled_post_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["post-predictions", id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, qc]);

  return query;
}
