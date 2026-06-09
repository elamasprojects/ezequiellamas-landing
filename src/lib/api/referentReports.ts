import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";

export type ReferentReport = Tables<"referent_reports">;

export type ReportContentMode = "short" | "youtube" | "combined";

export const REPORT_MODE_LABEL: Record<ReportContentMode, string> = {
  short: "Redes cortas",
  youtube: "YouTube",
  combined: "Síntesis",
};

export async function fetchReferentReports(
  referentId: string,
  contentMode?: ReportContentMode,
): Promise<ReferentReport[]> {
  let query = supabase
    .from("referent_reports")
    .select("*")
    .eq("referent_id", referentId)
    .order("created_at", { ascending: false });
  if (contentMode) query = query.eq("content_mode", contentMode);
  const { data, error } = await query;
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
  content_mode?: ReportContentMode;
  video_count?: number;
  period_label?: string;
  skipped?: boolean;
  reason?: string;
}

// (M24 + M33) Generate a strategic Markdown report for a referent in a given
// content mode. 'short'/'youtube' are incremental by default (force = full
// re-analysis); 'combined' always re-synthesizes over everything.
export async function createReferentStrategyReport(
  referentId: string,
  contentMode: ReportContentMode = "short",
  force = false,
): Promise<StrategyReportResult> {
  const { data, error } = await supabase.functions.invoke<StrategyReportResult>(
    "analyze-referent-strategy",
    { body: { referent_id: referentId, content_mode: contentMode, force } },
  );
  if (error) throw error;
  if (!data) throw new Error("analyze-referent-strategy returned empty response");
  return data;
}
