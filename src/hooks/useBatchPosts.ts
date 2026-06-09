import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface BatchPostRow {
  id: string;
  title: string | null;
  status: string;
  prep_status: string;
  prep_error: string | null;
  scheduled_at: string;
  thumbnail_url: string | null;
}

async function fetchBatchPosts(batchId: string): Promise<BatchPostRow[]> {
  const { data, error } = await supabase
    .from("scheduled_posts")
    .select("id, title, status, prep_status, prep_error, scheduled_at, thumbnail_url")
    .eq("batch_id", batchId)
    .order("scheduled_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as BatchPostRow[];
}

/**
 * Live view of a batch's rows. Realtime keeps it fresh as the worker flips
 * prep_status, with a polling fallback while anything is still in flight.
 */
export function useBatchPosts(batchId: string | null) {
  const qc = useQueryClient();

  const query = useQuery<BatchPostRow[]>({
    queryKey: ["batch-posts", batchId],
    queryFn: () => fetchBatchPosts(batchId!),
    enabled: !!batchId,
    refetchInterval: (q) => {
      const rows = q.state.data;
      if (!rows || rows.length === 0) return 5000;
      const pending = rows.some(
        (r) => r.prep_status === "queued" || r.prep_status === "captioning",
      );
      return pending ? 5000 : false;
    },
  });

  useEffect(() => {
    if (!batchId) return;
    const channel = supabase
      .channel(`batch-${batchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scheduled_posts", filter: `batch_id=eq.${batchId}` },
        () => qc.invalidateQueries({ queryKey: ["batch-posts", batchId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [batchId, qc]);

  return query;
}
