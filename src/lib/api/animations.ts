// Frontend API surface for the new "Animations" system (motion graphics).
// Sibling of `brolls.ts` — same shape, different table/edge functions.

import { supabase } from "@/lib/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";

export type MotionGraphicCategory = Tables<"motion_graphic_categories">;
export type MotionGraphicTemplate = Tables<"motion_graphic_templates">;
export type MotionGraphicSuggestion = Tables<"motion_graphic_suggestions">;
export type MotionGraphicSuggestionUpdate = TablesUpdate<"motion_graphic_suggestions">;
export type MotionGraphicSuggestionInsert = TablesInsert<"motion_graphic_suggestions">;

export type AnimationGenerationStatus =
  | "idle" | "queued" | "processing" | "done" | "failed";

const RENDERS_BUCKET = "motion-graphic-renders";

// ─── Catálogo ───────────────────────────────────────────────────────────────

export async function fetchMotionGraphicCategories(): Promise<MotionGraphicCategory[]> {
  const { data, error } = await supabase
    .from("motion_graphic_categories")
    .select("*")
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchMotionGraphicTemplates(): Promise<MotionGraphicTemplate[]> {
  const { data, error } = await supabase
    .from("motion_graphic_templates")
    .select("*")
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// ─── Suggestions per script ────────────────────────────────────────────────

export interface MotionGraphicSuggestionWithTemplate extends MotionGraphicSuggestion {
  motion_graphic_templates: Pick<
    MotionGraphicTemplate,
    "id" | "slug" | "name" | "tag" | "duration_s" | "category_id" | "content_slots"
  > | null;
}

export async function fetchAnimationsForScript(
  scriptId: string,
): Promise<MotionGraphicSuggestionWithTemplate[]> {
  const { data, error } = await supabase
    .from("motion_graphic_suggestions")
    .select(
      "*, motion_graphic_templates(id, slug, name, tag, duration_s, category_id, content_slots)",
    )
    .eq("script_id", scriptId)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MotionGraphicSuggestionWithTemplate[];
}

export interface QueuedAnimation extends MotionGraphicSuggestion {
  motion_graphic_templates: Pick<
    MotionGraphicTemplate,
    "id" | "slug" | "name" | "duration_s"
  > | null;
  scripts: { id: string; title: string | null } | null;
}

export async function fetchQueuedAnimations(): Promise<QueuedAnimation[]> {
  // The Animations Queue page mirrors the Brolls Queue: anything the admin
  // requested a render for, ordered newest first.
  const { data, error } = await supabase
    .from("motion_graphic_suggestions")
    .select(
      "*, motion_graphic_templates(id, slug, name, duration_s), scripts(id, title)",
    )
    .eq("requested", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as QueuedAnimation[];
}

export async function updateAnimation(
  id: string,
  input: MotionGraphicSuggestionUpdate,
): Promise<MotionGraphicSuggestion> {
  const { data, error } = await supabase
    .from("motion_graphic_suggestions")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAnimation(id: string): Promise<void> {
  const { error } = await supabase
    .from("motion_graphic_suggestions")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function insertAnimation(
  input: MotionGraphicSuggestionInsert,
): Promise<MotionGraphicSuggestion> {
  const { data, error } = await supabase
    .from("motion_graphic_suggestions")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Render dispatch ───────────────────────────────────────────────────────

export async function dispatchAnimationRender(
  suggestion_id: string,
): Promise<{ ok: boolean; status?: string }> {
  const { data, error } = await supabase.functions.invoke("render-motion-graphic", {
    body: { suggestion_id },
  });
  if (error) throw error;
  return data as { ok: boolean; status?: string };
}

// Bucket is private — sign the path stored in `output_url` for playback.
// Default 24h TTL is plenty for an admin reviewing renders in a session.
export async function signAnimationOutputUrl(
  storagePath: string,
  ttlSeconds = 60 * 60 * 24,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(RENDERS_BUCKET)
    .createSignedUrl(storagePath, ttlSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(`mg_sign_failed: ${error?.message ?? "no_signed_url"}`);
  }
  return data.signedUrl;
}

// ─── On-demand brolls (the renamed legacy path) ────────────────────────────

export async function dispatchOnDemandBrolls(
  script_id: string,
): Promise<{ ok: boolean; broll_count: number }> {
  const { data, error } = await supabase.functions.invoke("generate-brolls-on-demand", {
    body: { script_id },
  });
  if (error) throw error;
  return data as { ok: boolean; broll_count: number };
}
