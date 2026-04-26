import { supabase } from "@/lib/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";

export type Resource = Tables<"resources">;
export type ResourceInsert = TablesInsert<"resources">;
export type ResourceUpdate = TablesUpdate<"resources">;

export interface ResourceFilters {
  publishedOnly?: boolean;
  ownerOnly?: boolean;
}

export async function fetchResources(filters: ResourceFilters = {}): Promise<Resource[]> {
  let q = supabase.from("resources").select("*");
  if (filters.publishedOnly) q = q.eq("published", true);
  q = q.order("published_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function fetchResource(id: string): Promise<Resource | null> {
  const { data, error } = await supabase.from("resources").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchResourceBySlug(slug: string): Promise<Resource | null> {
  const { data, error } = await supabase
    .from("resources")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createResource(input: Omit<ResourceInsert, "owner_id"> & { owner_id: string }): Promise<Resource> {
  const payload: ResourceInsert = {
    ...input,
    published_at: input.published ? input.published_at ?? new Date().toISOString() : null,
  };
  const { data, error } = await supabase.from("resources").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateResource(id: string, input: ResourceUpdate, current?: Resource): Promise<Resource> {
  const update: ResourceUpdate = { ...input };
  // If we're publishing for the first time, set published_at
  if (update.published === true && current && !current.published_at) {
    update.published_at = new Date().toISOString();
  }
  // If we're unpublishing, clear published_at
  if (update.published === false) {
    update.published_at = null;
  }
  const { data, error } = await supabase
    .from("resources")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteResource(id: string): Promise<void> {
  const { error } = await supabase.from("resources").delete().eq("id", id);
  if (error) throw error;
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}
