import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";
import { invokeFn } from "@/lib/api/invokeFn";
import type { PublishPlatform } from "@/lib/publishing/platformLimits";

export type PostPrediction = Tables<"post_predictions">;

// Shapes of the jsonb columns (loosely typed in database.types as Json).
export interface PredictionDriver {
  factor: string;
  direction: "positive" | "negative";
  weight?: number;
  note?: string;
}
export interface ReferentSignal {
  referent_name: string;
  concept?: string;
  their_lift?: number;
  similarity?: "low" | "medium" | "high";
  note?: string;
}
export interface PredictionRisk {
  risk: string;
  severity?: "low" | "medium" | "high";
  note?: string;
}
export interface PredictionBaseline {
  n?: number;
  median?: number | null;
  p25?: number | null;
  p75?: number | null;
  max?: number | null;
}

interface PredictResponse {
  ok?: boolean;
  cached?: boolean;
  predictions: PostPrediction[];
  error?: string;
}

/** Run (or re-run with force) the AI virality prediction for a scheduled post. */
export async function predictVirality(
  scheduledPostId: string,
  opts?: { platforms?: PublishPlatform[]; force?: boolean },
): Promise<PostPrediction[]> {
  const res = await invokeFn<PredictResponse>("predict-virality", {
    scheduled_post_id: scheduledPostId,
    ...(opts?.platforms ? { platforms: opts.platforms } : {}),
    ...(opts?.force ? { force: true } : {}),
  });
  if (!res.ok) throw new Error(res.error ?? "La predicción falló");
  if (res.data && "error" in res.data && res.data.error) throw new Error(res.data.error);
  return res.data?.predictions ?? [];
}

/** Load stored predictions for a scheduled post (one row per platform). */
export async function fetchPredictions(scheduledPostId: string): Promise<PostPrediction[]> {
  const { data, error } = await supabase
    .from("post_predictions")
    .select("*")
    .eq("scheduled_post_id", scheduledPostId)
    .order("platform", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Capture actuals + compute prediction error (post-publish, arithmetic only). */
export async function evaluatePrediction(scheduledPostId: string): Promise<unknown> {
  const res = await invokeFn("evaluate-prediction", { scheduled_post_id: scheduledPostId });
  if (!res.ok) throw new Error(res.error ?? "La evaluación falló");
  return res.data;
}
