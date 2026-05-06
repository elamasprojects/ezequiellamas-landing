import { supabase } from "@/lib/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";

export type BrollStyle = Tables<"broll_styles">;
export type BrollStyleInsert = TablesInsert<"broll_styles">;
export type BrollStyleUpdate = TablesUpdate<"broll_styles">;
export type BrollSuggestion = Tables<"broll_suggestions">;

export type BrollVariant = "v1" | "v2";
export type BrollGenerationStatus = "idle" | "queued" | "processing" | "done" | "failed";

export interface BrollSuggestionWithScript extends BrollSuggestion {
  scripts: {
    id: string;
    title: string | null;
    hook: string | null;
    development: string | null;
    cta: string | null;
    generated_script: string | null;
  } | null;
  broll_styles: Pick<BrollStyle, "id" | "name" | "variant"> | null;
}

export async function fetchQueuedBrolls(): Promise<BrollSuggestionWithScript[]> {
  const { data, error } = await supabase
    .from("broll_suggestions")
    .select(
      "*, scripts(id, title, hook, development, cta, generated_script), broll_styles(id, name, variant)",
    )
    .eq("requested", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BrollSuggestionWithScript[];
}

export async function fetchBrollStyles(): Promise<BrollStyle[]> {
  const { data, error } = await supabase
    .from("broll_styles")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createBrollStyle(
  input: Omit<BrollStyleInsert, "owner_id">,
): Promise<BrollStyle> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");
  const { data, error } = await supabase
    .from("broll_styles")
    .insert({ ...input, owner_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBrollStyle(
  id: string,
  input: BrollStyleUpdate,
): Promise<BrollStyle> {
  const { data, error } = await supabase
    .from("broll_styles")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBrollStyle(id: string): Promise<void> {
  const { error } = await supabase.from("broll_styles").delete().eq("id", id);
  if (error) throw error;
}

export async function updateBrollSuggestion(
  id: string,
  input: Partial<{
    requested: boolean;
    variant: BrollVariant | null;
    style_id: string | null;
    image_description: string | null;
    animation_description: string | null;
    selected_words: string[] | null;
    suggestion: string;
    cue_text: string | null;
    position: number;
  }>,
): Promise<BrollSuggestion> {
  const { data, error } = await supabase
    .from("broll_suggestions")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function insertBrollSuggestion(input: {
  script_id: string;
  position: number;
  suggestion: string;
  cue_text?: string | null;
  image_description?: string | null;
  animation_description?: string | null;
  selected_words?: string[] | null;
  is_manual?: boolean;
  variant?: BrollVariant | null;
  style_id?: string | null;
  requested?: boolean;
}): Promise<BrollSuggestion> {
  const { data, error } = await supabase
    .from("broll_suggestions")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBrollSuggestion(id: string): Promise<void> {
  const { error } = await supabase.from("broll_suggestions").delete().eq("id", id);
  if (error) throw error;
}

export async function dispatchBrollGeneration(
  broll_suggestion_id: string,
): Promise<{ ok: boolean }> {
  const { data, error } = await supabase.functions.invoke("generate-broll", {
    body: { broll_suggestion_id },
  });
  if (error) throw error;
  return data as { ok: boolean };
}
