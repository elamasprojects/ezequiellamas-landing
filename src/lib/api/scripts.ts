import { supabase } from "@/lib/supabase";
import type { Tables, TablesUpdate } from "@/lib/database.types";

export type Script = Tables<"scripts">;
export type ScriptUpdate = TablesUpdate<"scripts">;
export type BrollSuggestion = Tables<"broll_suggestions">;

export type ScriptStatus = "draft" | "scheduled" | "recorded" | "posted" | "archived";

export interface ScriptWithBrolls extends Script {
  broll_suggestions: BrollSuggestion[];
  formats: { id: string; name: string } | null;
}

export async function fetchScripts(opts?: { status?: ScriptStatus }): Promise<Script[]> {
  let query = supabase.from("scripts").select("*").order("created_at", { ascending: false });
  if (opts?.status) query = query.eq("status", opts.status);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchScript(id: string): Promise<ScriptWithBrolls | null> {
  const { data, error } = await supabase
    .from("scripts")
    .select("*, broll_suggestions(*), formats(id, name)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  // Sort brolls by position
  const brolls = (data.broll_suggestions ?? []).slice().sort((a, b) => a.position - b.position);
  return { ...data, broll_suggestions: brolls } as ScriptWithBrolls;
}

export async function updateScript(id: string, input: ScriptUpdate): Promise<Script> {
  const { data, error } = await supabase
    .from("scripts")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteScript(id: string): Promise<void> {
  const { error } = await supabase.from("scripts").delete().eq("id", id);
  if (error) throw error;
}
