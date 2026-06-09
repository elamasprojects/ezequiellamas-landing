import { supabase } from "@/lib/supabase";
import type { Tables, TablesInsert } from "@/lib/database.types";

export type ClipAnalysisSettings = Tables<"clip_analysis_settings">;
export type ClipAnalysisSettingsInsert = TablesInsert<"clip_analysis_settings">;

// Mirror the worker's hardcoded defaults so the form shows the real behavior
// before a row exists.
export const CLIP_SETTINGS_DEFAULTS = {
  enabled: true,
  maturity_days: 10,
  relative_multiplier: 1.5,
  min_history_clips: 5,
  absolute_min_views: 5000,
};

export type ClipSettingsPatch = Partial<
  Pick<
    ClipAnalysisSettings,
    "enabled" | "maturity_days" | "relative_multiplier" | "min_history_clips" | "absolute_min_views"
  >
>;

export async function fetchClipAnalysisSettings(): Promise<ClipAnalysisSettings | null> {
  const { data, error } = await supabase
    .from("clip_analysis_settings")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

// One row per owner; upsert keyed by owner_id.
export async function upsertClipAnalysisSettings(
  ownerId: string,
  patch: ClipSettingsPatch,
): Promise<ClipAnalysisSettings> {
  const { data, error } = await supabase
    .from("clip_analysis_settings")
    .upsert(
      { owner_id: ownerId, ...patch } as ClipAnalysisSettingsInsert,
      { onConflict: "owner_id" },
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}
