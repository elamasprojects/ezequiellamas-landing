import { supabase } from "@/lib/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";

export type Series = Tables<"series">;
export type SeriesInsert = TablesInsert<"series">;
export type SeriesUpdate = TablesUpdate<"series">;

export const SUGGESTED_SERIES = [
  {
    name: "Aplicando Claude a negocios",
    description:
      "Cada video muestra una herramienta o feature de IA aplicada a un caso de uso real (UGC Studio, AdvantX, clientes). Día N construyendo con IA. El ángulo único: no soy developer mostrando features, soy dueño de negocio que las usa.",
  },
  {
    name: "Funciones de Claude que no conocías",
    description:
      "Showcase de features de Claude/Claude Code que pasan por debajo del radar. Una feature por video, con demo y aplicación inmediata. El gancho de \"no conocías\" debe estar respaldado con caso de uso real, no puro hype.",
  },
];

export async function fetchSeries(): Promise<Series[]> {
  const { data, error } = await supabase
    .from("series")
    .select("*")
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createSeries(
  input: Pick<SeriesInsert, "name" | "description" | "example_url">,
  ownerId: string,
  position: number,
): Promise<Series> {
  const { data, error } = await supabase
    .from("series")
    .insert({ ...input, owner_id: ownerId, position })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSeries(id: string, input: SeriesUpdate): Promise<Series> {
  const { data, error } = await supabase
    .from("series")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSeries(id: string): Promise<void> {
  const { error } = await supabase.from("series").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderSeries(orderedIds: string[]): Promise<void> {
  const updates = orderedIds.map((id, index) =>
    supabase.from("series").update({ position: index }).eq("id", id),
  );
  const results = await Promise.all(updates);
  const firstError = results.find((r) => r.error);
  if (firstError?.error) throw firstError.error;
}

export async function seedDefaultSeries(ownerId: string): Promise<Series[]> {
  const rows: SeriesInsert[] = SUGGESTED_SERIES.map((s, i) => ({
    ...s,
    owner_id: ownerId,
    position: i,
  }));
  const { data, error } = await supabase.from("series").insert(rows).select();
  if (error) throw error;
  return data ?? [];
}
