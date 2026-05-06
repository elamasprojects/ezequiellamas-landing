import { supabase } from "@/lib/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";

export type CoverStyle = Tables<"cover_styles">;
export type CoverStyleInsert = TablesInsert<"cover_styles">;
export type CoverStyleUpdate = TablesUpdate<"cover_styles">;

export const SUGGESTED_COVER_STYLES: Omit<CoverStyleInsert, "owner_id" | "position">[] = [
  {
    name: "thumb-short-object",
    description: "Producto u objeto físico en primer plano, texto de impacto superpuesto.",
    when_to_use: "Ideal para videos sobre herramientas, apps, productos físicos o demos de software.",
    system_prompt:
      "Center the composition around a single physical object or product on a dark background. The object should be lit dramatically with a subtle violet glow. Overlay bold Poppins text with the key phrase. Minimal other elements. Product photography aesthetic.",
  },
  {
    name: "short-pov",
    description: "POV del founder hablando a cámara, fondo desenfocado o bokeh oscuro.",
    when_to_use: "Para videos educativos, opinión, tutoriales donde el founder es el sujeto principal.",
    system_prompt:
      "First-person perspective composition. The person faces the camera directly, shoulders and face visible. Dark bokeh background. Confident, direct expression. Violet glow rim light on the edges. Bold text at the bottom third of the frame.",
  },
  {
    name: "thumb-short-background-split",
    description: "Imagen dividida: problema vs solución, antes vs después, izquierda vs derecha.",
    when_to_use: "Para comparativas, contrastes, videos de tipo 'antes/después' o 'esto vs aquello'.",
    system_prompt:
      "Split-screen composition: left side shows the problem/before state (muted, darker tones), right side shows the solution/after (brighter, with violet accent). Clear vertical dividing line. Bold text on each side. High contrast.",
  },
  {
    name: "thumb-data",
    description: "Dashboard, cifras o métricas grandes como elemento visual central.",
    when_to_use: "Para videos con datos, resultados, métricas o casos de estudio con números concretos.",
    system_prompt:
      "Data visualization aesthetic. Large numbers or metrics prominently displayed. Dark background with a subtle grid or chart element. Violet/purple accent highlights on key numbers. Clean, analytical visual style.",
  },
  {
    name: "thumb-cinematic",
    description: "Encuadre cinematográfico oscuro, sujeto parcialmente iluminado, misterio controlado.",
    when_to_use: "Para narrativas, storytelling, reveals o videos con gancho emocional fuerte.",
    system_prompt:
      "Cinematic widescreen composition (even if portrait ratio). Low-key lighting with one dramatic light source. Subject partially in shadow. Moody, mysterious atmosphere. Minimal text — just the key phrase in a clean sans-serif.",
  },
];

export async function fetchCoverStyles(): Promise<CoverStyle[]> {
  const { data, error } = await supabase
    .from("cover_styles")
    .select("*")
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createCoverStyle(
  input: Pick<CoverStyleInsert, "name" | "description" | "when_to_use" | "system_prompt" | "reference_image_url">,
  ownerId: string,
  position: number,
): Promise<CoverStyle> {
  const { data, error } = await supabase
    .from("cover_styles")
    .insert({ ...input, owner_id: ownerId, position })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCoverStyle(id: string, input: CoverStyleUpdate): Promise<CoverStyle> {
  const { data, error } = await supabase
    .from("cover_styles")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCoverStyle(id: string): Promise<void> {
  const { error } = await supabase.from("cover_styles").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderCoverStyles(orderedIds: string[]): Promise<void> {
  const updates = orderedIds.map((id, index) =>
    supabase.from("cover_styles").update({ position: index }).eq("id", id),
  );
  const results = await Promise.all(updates);
  const firstError = results.find((r) => r.error);
  if (firstError?.error) throw firstError.error;
}

export async function seedDefaultCoverStyles(ownerId: string): Promise<CoverStyle[]> {
  const rows: CoverStyleInsert[] = SUGGESTED_COVER_STYLES.map((s, i) => ({
    ...s,
    owner_id: ownerId,
    position: i,
  }));
  const { data, error } = await supabase.from("cover_styles").insert(rows).select();
  if (error) throw error;
  return data ?? [];
}

export async function uploadCoverStyleReferenceImage(
  styleId: string,
  ownerId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${ownerId}/${styleId}.${ext}`;
  const { error: uploadErr } = await supabase.storage
    .from("cover-assets")
    .upload(path, file, { upsert: true });
  if (uploadErr) throw uploadErr;
  const { data } = await supabase.storage.from("cover-assets").createSignedUrl(path, 365 * 24 * 3600);
  return data?.signedUrl ?? path;
}
