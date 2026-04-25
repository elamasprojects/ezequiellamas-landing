import { supabase } from "@/lib/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";

export type Format = Tables<"formats">;
export type FormatInsert = TablesInsert<"formats">;
export type FormatUpdate = TablesUpdate<"formats">;

export const SUGGESTED_FORMATS = [
  {
    name: "Pantalla + rostro",
    description: "Grabás tu pantalla mostrando algo + tu cara en cámara reaccionando o explicando.",
  },
  {
    name: "Calle / outdoor",
    description: "Caminando, en eventos, en lugares públicos. Más casual.",
  },
  {
    name: "Entrevista",
    description: "Otra persona te pregunta y vos respondés. Cámara fija de uno o dos planos.",
  },
  {
    name: "Pregunta y respuesta",
    description: "Alguien sostiene su celular, te hace una pregunta, vos respondés.",
  },
  {
    name: "Talking head",
    description: "Vos a cámara, fondo neutro, sin distracciones. Foco total en el mensaje.",
  },
];

export async function fetchFormats(): Promise<Format[]> {
  const { data, error } = await supabase
    .from("formats")
    .select("*")
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createFormat(
  input: Pick<FormatInsert, "name" | "description" | "example_url">,
  ownerId: string,
  position: number,
): Promise<Format> {
  const { data, error } = await supabase
    .from("formats")
    .insert({ ...input, owner_id: ownerId, position })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateFormat(id: string, input: FormatUpdate): Promise<Format> {
  const { data, error } = await supabase
    .from("formats")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteFormat(id: string): Promise<void> {
  const { error } = await supabase.from("formats").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderFormats(orderedIds: string[]): Promise<void> {
  const updates = orderedIds.map((id, index) =>
    supabase.from("formats").update({ position: index }).eq("id", id),
  );
  const results = await Promise.all(updates);
  const firstError = results.find((r) => r.error);
  if (firstError?.error) throw firstError.error;
}

export async function seedDefaultFormats(ownerId: string): Promise<Format[]> {
  const rows: FormatInsert[] = SUGGESTED_FORMATS.map((f, i) => ({
    ...f,
    owner_id: ownerId,
    position: i,
  }));
  const { data, error } = await supabase.from("formats").insert(rows).select();
  if (error) throw error;
  return data ?? [];
}
