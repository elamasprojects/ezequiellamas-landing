import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";

export type PromptOverride = Tables<"prompt_overrides">;

// The editable prompt slots shown in the "Prompts IA" settings tab, grouped by
// area. `comingSoon` slots render disabled (their generation function ships in a
// later milestone, but the slot is reserved so the slug is stable).
export interface PromptSlot {
  slug: string;
  label: string;
  group: string;
  help?: string;
  comingSoon?: boolean;
}

export const PROMPT_SLOTS: PromptSlot[] = [
  {
    slug: "script.system",
    label: "Encabezado / instrucciones",
    group: "Guion short-form",
    help: "Las reglas no negociables y el rol que asume la IA al escribir guiones.",
  },
  {
    slug: "script.manifesto",
    label: "Manifiesto de marca",
    group: "Guion short-form",
    help: "Quién sos, tu trayectoria, tu voz, tus opiniones, tus referentes y tu estrategia.",
  },
  {
    slug: "script.scripting_rules",
    label: "Reglas de scripting",
    group: "Guion short-form",
    help: "El framework operativo: estructura, buckets, avatars, anti-AI-tells, SEO.",
  },
  {
    slug: "script.hook_bank",
    label: "Banco de hooks",
    group: "Guion short-form",
    help: "El catálogo de hooks verbales y visuales que la IA elige por concepto.",
  },
  {
    slug: "adapt.copy",
    label: "Adaptar idea — Copiar",
    group: "Adaptar ideas",
    help: "Cómo replicar una idea de un competidor tal cual, sin cambios.",
    comingSoon: true,
  },
  {
    slug: "adapt.voice",
    label: "Adaptar idea — A mi voz",
    group: "Adaptar ideas",
    help: "Cómo tomar una idea ajena y reescribirla con tu voz y tu perfil.",
    comingSoon: true,
  },
  {
    slug: "adapt.instructions",
    label: "Adaptar idea — Con instrucciones",
    group: "Adaptar ideas",
    help: "Cómo adaptar una idea siguiendo instrucciones puntuales que escribís.",
    comingSoon: true,
  },
  {
    slug: "youtube.structure",
    label: "Estructura long-form",
    group: "YouTube",
    help: "Cómo generar la estructura (intro, capítulos, CTA) de un video largo.",
    comingSoon: true,
  },
];

export async function fetchPromptOverrides(): Promise<PromptOverride[]> {
  const { data, error } = await supabase
    .from("prompt_overrides")
    .select("*");
  if (error) throw error;
  return data ?? [];
}

export async function upsertPromptOverride(
  ownerId: string,
  slug: string,
  content: string,
): Promise<PromptOverride> {
  const { data, error } = await supabase
    .from("prompt_overrides")
    .upsert({ owner_id: ownerId, slug, content }, { onConflict: "owner_id,slug" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// "Reset to default" = delete the override row; generation falls back to the
// hardcoded default automatically.
export async function resetPromptOverride(ownerId: string, slug: string): Promise<void> {
  const { error } = await supabase
    .from("prompt_overrides")
    .delete()
    .eq("owner_id", ownerId)
    .eq("slug", slug);
  if (error) throw error;
}

// The hardcoded defaults, served by the get-prompt-defaults edge function so the
// UI shows the real deployed text (single source of truth). Degrades gracefully
// to an empty map if the function isn't deployed yet — the tab still lets you
// write overrides, it just won't pre-fill the default text.
export async function fetchPromptDefaults(): Promise<Record<string, string>> {
  try {
    const { data, error } = await supabase.functions.invoke<{ defaults: Record<string, string> }>(
      "get-prompt-defaults",
      { body: {} },
    );
    if (error) throw error;
    return data?.defaults ?? {};
  } catch {
    return {};
  }
}
