import { supabase } from "@/lib/supabase";
import type { Tables, TablesInsert } from "@/lib/database.types";

export type CreatorProfile = Tables<"creator_profile">;
export type CreatorProfileUpsert = TablesInsert<"creator_profile">;

// One aspirational referent (transcript 3.2): name + what I like + why.
export interface AspirationalReferent {
  name: string;
  what_i_like: string;
  why: string;
}

// Fields the brand tab owns.
export type BrandPatch = Partial<
  Pick<
    CreatorProfile,
    "product_service" | "target_audience" | "short_form_strategy" | "long_form_strategy"
  >
> & { aspirational_referents?: AspirationalReferent[] };

// Fields the questionnaire tab owns.
export type QuestionnairePatch = Partial<
  Pick<
    CreatorProfile,
    | "who_am_i"
    | "my_story"
    | "what_i_transmit"
    | "why_i_create"
    | "desired_impact"
    | "skills_knowledge"
  >
>;

export async function fetchCreatorProfile(): Promise<CreatorProfile | null> {
  const { data, error } = await supabase
    .from("creator_profile")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Upsert keyed by owner_id (one row per owner). Each tab sends only its own
// fields; the upsert merges them onto the single row.
export async function upsertCreatorProfile(
  ownerId: string,
  patch: BrandPatch | QuestionnairePatch,
): Promise<CreatorProfile> {
  const { data, error } = await supabase
    .from("creator_profile")
    .upsert(
      { owner_id: ownerId, ...patch } as CreatorProfileUpsert,
      { onConflict: "owner_id" },
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Normalizes the jsonb column into a typed array for the form.
export function parseReferents(value: unknown): AspirationalReferent[] {
  if (!Array.isArray(value)) return [];
  return value.map((r) => {
    const o = (r ?? {}) as Record<string, unknown>;
    return {
      name: String(o.name ?? ""),
      what_i_like: String(o.what_i_like ?? ""),
      why: String(o.why ?? ""),
    };
  });
}
