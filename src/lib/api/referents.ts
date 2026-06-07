import { supabase } from "@/lib/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";
import { deriveHandlesFromUrls } from "@/lib/parseProfileUrl";

export type Referent = Tables<"referents">;
export type ReferentInsert = TablesInsert<"referents">;
export type ReferentUpdate = TablesUpdate<"referents">;
export type ReferentVideo = Tables<"referent_videos">;

export interface ReferentInputFields {
  name: string;
  note: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
}

export async function fetchReferents(): Promise<Referent[]> {
  const { data, error } = await supabase
    .from("referents")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchReferent(id: string): Promise<Referent> {
  const { data, error } = await supabase
    .from("referents")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createReferent(
  input: ReferentInputFields,
  ownerId: string,
  position: number,
): Promise<Referent> {
  const handles = deriveHandlesFromUrls(input);
  const payload: ReferentInsert = {
    owner_id: ownerId,
    name: input.name.trim(),
    note: input.note?.trim() || null,
    instagram_url: input.instagram_url?.trim() || null,
    youtube_url: input.youtube_url?.trim() || null,
    tiktok_url: input.tiktok_url?.trim() || null,
    instagram_handle: handles.instagram_handle,
    youtube_handle: handles.youtube_handle,
    tiktok_handle: handles.tiktok_handle,
    position,
  };
  const { data, error } = await supabase
    .from("referents")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateReferent(id: string, input: ReferentInputFields): Promise<Referent> {
  const handles = deriveHandlesFromUrls(input);
  const payload: ReferentUpdate = {
    name: input.name.trim(),
    note: input.note?.trim() || null,
    instagram_url: input.instagram_url?.trim() || null,
    youtube_url: input.youtube_url?.trim() || null,
    tiktok_url: input.tiktok_url?.trim() || null,
    instagram_handle: handles.instagram_handle,
    youtube_handle: handles.youtube_handle,
    tiktok_handle: handles.tiktok_handle,
  };
  const { data, error } = await supabase
    .from("referents")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteReferent(id: string): Promise<void> {
  const { error } = await supabase.from("referents").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchReferentVideos(referentId: string): Promise<ReferentVideo[]> {
  const { data, error } = await supabase
    .from("referent_videos")
    .select("*")
    .eq("referent_id", referentId)
    .order("views_total", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

// (M23) An analyzed viral with its referent's name attached, for the
// "Crear a partir de ideas" ingredient picker. Only transcript-done rows are
// usable as ingredients (the generator needs the transcript).
export type AnalyzedReferentVideo = ReferentVideo & { referent_name: string | null };

export async function fetchAnalyzedReferentVideos(): Promise<AnalyzedReferentVideo[]> {
  const { data, error } = await supabase
    .from("referent_videos")
    .select("*, referents(name)")
    .eq("transcript_status", "done")
    .order("views_total", { ascending: false, nullsFirst: false })
    .limit(150);
  if (error) throw error;
  return (data ?? []).map((row) => {
    const { referents, ...rest } = row as ReferentVideo & {
      referents: { name: string | null } | { name: string | null }[] | null;
    };
    const ref = Array.isArray(referents) ? referents[0] : referents;
    return { ...(rest as ReferentVideo), referent_name: ref?.name ?? null };
  });
}

export interface ScrapeResult {
  ok: boolean;
  scraped: { instagram: number; youtube: number; tiktok: number };
  errors: { platform: string; error: string }[];
}

export async function scrapeReferentVideos(referentId: string): Promise<ScrapeResult> {
  const { data, error } = await supabase.functions.invoke<ScrapeResult>(
    "scrape-referent-videos",
    { body: { referent_id: referentId } },
  );
  if (error) throw error;
  if (!data) throw new Error("scrape-referent-videos returned empty response");
  return data;
}

export interface AnalyzeResult {
  ok: boolean;
  cached?: boolean;
  transcript_status: string;
  concept_status: string;
  transcript_error?: string | null;
  concept_error?: string | null;
}

export async function analyzeReferentVideo(
  referentVideoId: string,
  force = false,
): Promise<AnalyzeResult> {
  const { data, error } = await supabase.functions.invoke<AnalyzeResult>(
    "analyze-referent-video",
    { body: { referent_video_id: referentVideoId, force } },
  );
  if (error) throw error;
  if (!data) throw new Error("analyze-referent-video returned empty response");
  return data;
}
