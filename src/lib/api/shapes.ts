import { supabase } from "@/lib/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";

export type Shape = Tables<"shapes">;
export type ShapeInsert = TablesInsert<"shapes">;
export type ShapeUpdate = TablesUpdate<"shapes">;

export const SUGGESTED_SHAPES = [
  {
    name: "Antes / Después",
    description:
      "ROI-driven. Hook con un número shock (tiempo o $ ahorrado), problema concreto en el negocio, demo en tiempo real, ROI tangible, CTA con comment-gate. ~50-60 seg. Mejor con Pantalla + rostro o Talking head.",
  },
  {
    name: "Stack tour",
    description:
      "Behind-the-scenes. Hook que apalanca tu autoridad (números reales del negocio), tour del flujo paso 1-2-3, aprendizaje contraintuitivo, CTA. ~55-65 seg. Mejor con Pizarrón o Esquema animado over voice.",
  },
  {
    name: "Hot take + demo",
    description:
      "Curiosidad + autoridad. Hook con afirmación contrarian, argumento corto del por qué, demo de la feature como vos la usás, implicación, CTA. ~55 seg. Mejor con Talking head o Pantalla + rostro.",
  },
];

export async function fetchShapes(): Promise<Shape[]> {
  const { data, error } = await supabase
    .from("shapes")
    .select("*")
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createShape(
  input: Pick<ShapeInsert, "name" | "description" | "example_url">,
  ownerId: string,
  position: number,
): Promise<Shape> {
  const { data, error } = await supabase
    .from("shapes")
    .insert({ ...input, owner_id: ownerId, position })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateShape(id: string, input: ShapeUpdate): Promise<Shape> {
  const { data, error } = await supabase
    .from("shapes")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteShape(id: string): Promise<void> {
  const { error } = await supabase.from("shapes").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderShapes(orderedIds: string[]): Promise<void> {
  const updates = orderedIds.map((id, index) =>
    supabase.from("shapes").update({ position: index }).eq("id", id),
  );
  const results = await Promise.all(updates);
  const firstError = results.find((r) => r.error);
  if (firstError?.error) throw firstError.error;
}

export async function seedDefaultShapes(ownerId: string): Promise<Shape[]> {
  const rows: ShapeInsert[] = SUGGESTED_SHAPES.map((s, i) => ({
    ...s,
    owner_id: ownerId,
    position: i,
  }));
  const { data, error } = await supabase.from("shapes").insert(rows).select();
  if (error) throw error;
  return data ?? [];
}
