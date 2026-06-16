import { supabase } from "@/lib/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";
import { deriveHandlesFromUrls } from "@/lib/parseProfileUrl";

export type Referent = Tables<"referents">;
export type ReferentInsert = TablesInsert<"referents">;
export type ReferentUpdate = TablesUpdate<"referents">;
export type ReferentVideo = Tables<"referent_videos">;

// (M32) Structured long-form analysis stored in referent_videos.long_form_breakdown
// (jsonb) for videos >= 180s. Null for short-form.
export interface LongFormSection {
  title: string;
  summary: string;
}
export interface LongFormBreakdown {
  thesis: string;
  structure: LongFormSection[];
  key_arguments: string[];
  offer_or_cta: string;
  retention_tactics: string[];
}

export function parseLongFormBreakdown(value: unknown): LongFormBreakdown | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  if (typeof o.thesis !== "string") return null;
  const structure = Array.isArray(o.structure)
    ? o.structure
        .map((s) => {
          const r = (s ?? {}) as Record<string, unknown>;
          return { title: String(r.title ?? ""), summary: String(r.summary ?? "") };
        })
        .filter((s) => s.title || s.summary)
    : [];
  const toStrArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];
  return {
    thesis: o.thesis,
    structure,
    key_arguments: toStrArr(o.key_arguments),
    offer_or_cta: typeof o.offer_or_cta === "string" ? o.offer_or_cta : "",
    retention_tactics: toStrArr(o.retention_tactics),
  };
}

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

// Every referent's videos in one feed, best metrics first, each tagged with its
// referent's name. Powers the global feed reachable from the referents list.
export async function fetchAllReferentVideos(limit = 400): Promise<AnalyzedReferentVideo[]> {
  const { data, error } = await supabase
    .from("referent_videos")
    .select("*, referents(name)")
    .order("views_total", { ascending: false, nullsFirst: false })
    .limit(limit);
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

// (M24) Dispatch bulk per-video analysis (transcript + concept + classification)
// for a referent's pending videos. Fire-and-forget on the backend.
export interface BulkAnalyzeResult {
  ok: boolean;
  dispatched: number;
  ids: string[];
}

export async function bulkAnalyzeReferent(
  referentId: string,
  force = false,
): Promise<BulkAnalyzeResult> {
  const { data, error } = await supabase.functions.invoke<BulkAnalyzeResult>(
    "bulk-analyze-referents",
    { body: { referent_id: referentId, force } },
  );
  if (error) throw error;
  if (!data) throw new Error("bulk-analyze-referents returned empty response");
  return data;
}

// ---- (M24) Referent collections: save virals from the feed into named collections ----

export type ReferentCollection = Tables<"referent_collections"> & { item_count: number };

export const DEFAULT_REFERENT_COLLECTION = "Guardados";

export async function fetchReferentCollections(): Promise<ReferentCollection[]> {
  const { data, error } = await supabase
    .from("referent_collections")
    .select("*, referent_collection_items(count)")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((c) => {
    const { referent_collection_items, ...rest } = c as Tables<"referent_collections"> & {
      referent_collection_items?: { count: number }[];
    };
    return { ...(rest as Tables<"referent_collections">), item_count: referent_collection_items?.[0]?.count ?? 0 };
  });
}

// Ids of every referent video the owner has saved (any collection) — drives the
// "saved" pill state in the feed.
export async function fetchSavedReferentVideoIds(): Promise<string[]> {
  const { data, error } = await supabase.from("referent_collection_items").select("referent_video_id");
  if (error) throw error;
  return Array.from(new Set((data ?? []).map((r) => r.referent_video_id)));
}

export async function createReferentCollection(name: string, ownerId: string): Promise<ReferentCollection> {
  const { data, error } = await supabase
    .from("referent_collections")
    .insert({ owner_id: ownerId, name: name.trim() })
    .select("*")
    .single();
  if (error) throw error;
  return { ...data, item_count: 0 };
}

async function ensureDefaultCollection(ownerId: string): Promise<string> {
  const { data: existing } = await supabase
    .from("referent_collections")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("name", DEFAULT_REFERENT_COLLECTION)
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id;
  const created = await createReferentCollection(DEFAULT_REFERENT_COLLECTION, ownerId);
  return created.id;
}

export async function saveToReferentCollection(opts: {
  referentVideoId: string;
  ownerId: string;
  collectionId?: string;
}): Promise<void> {
  const collectionId = opts.collectionId ?? (await ensureDefaultCollection(opts.ownerId));
  const { error } = await supabase
    .from("referent_collection_items")
    .insert({ collection_id: collectionId, referent_video_id: opts.referentVideoId });
  // 23505 = already in this collection; treat as success.
  if (error && error.code !== "23505") throw error;
}

export async function removeFromReferentCollection(opts: {
  collectionId: string;
  referentVideoId: string;
}): Promise<void> {
  const { error } = await supabase
    .from("referent_collection_items")
    .delete()
    .eq("collection_id", opts.collectionId)
    .eq("referent_video_id", opts.referentVideoId);
  if (error) throw error;
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
