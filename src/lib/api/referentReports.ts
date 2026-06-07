import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";

export type ReferentReport = Tables<"referent_reports">;

export async function fetchReferentReports(referentId: string): Promise<ReferentReport[]> {
  const { data, error } = await supabase
    .from("referent_reports")
    .select("*")
    .eq("referent_id", referentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchReferentReport(id: string): Promise<ReferentReport> {
  const { data, error } = await supabase
    .from("referent_reports")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export interface StrategyReportResult {
  ok: boolean;
  report_id?: string;
  video_count?: number;
  period_label?: string;
  skipped?: boolean;
  reason?: string;
}

// (M24) Generate a strategic Markdown report for a referent. Incremental by
// default (only videos newer than the last report); force = full re-analysis.
export async function createReferentStrategyReport(
  referentId: string,
  force = false,
): Promise<StrategyReportResult> {
  const { data, error } = await supabase.functions.invoke<StrategyReportResult>(
    "analyze-referent-strategy",
    { body: { referent_id: referentId, force } },
  );
  if (error) throw error;
  if (!data) throw new Error("analyze-referent-strategy returned empty response");
  return data;
}
