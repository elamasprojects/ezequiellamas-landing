import { supabase } from "@/lib/supabase";

export interface GenerateScriptInput {
  audio_upload_id?: string;
  raw_concept?: string;
  format_id?: string;
  shape_id?: string;
  series_id?: string;
  part_number?: number;
  idea_reference_id?: string;
  /**
   * Adaptar un viral del banco de referentes (`referent_videos`) a la voz
   * de Ezequiel. La edge function fetchea transcript + concept_summary +
   * caption + título del referent_video y los inyecta como referencia
   * inspiracional. El script resultante queda linkeado vía
   * `scripts.referent_video_id` (tag de procedencia).
   */
  referent_video_id?: string;
  reference_mode?: "structure_only" | "content_adapt";
  /**
   * Si está seteado, en vez de crear un script nuevo, regenera el existente
   * in-place (overwrite de hook/development/cta/etc + reemplazo de brolls).
   * Mantiene el id, format/shape/series/part_number salvo que se sobreescriban
   * explícitamente en este input.
   */
  target_script_id?: string;
}

export interface GenerateScriptResult {
  script_id: string;
  regenerated?: boolean;
}

// Supabase JS oculta el body en FunctionsHttpError (sólo expone
// `error.message = "Edge function returned a non-2xx status code"`). El body
// real con `{ error: "..." }` queda en `error.context` (un Response), pero
// hay que parsearlo a mano. Sin esto, cualquier 5xx del backend se manifiesta
// como un mensaje opaco e indebuggeable para el usuario.
async function extractBackendError(error: unknown): Promise<string> {
  const fallback =
    (error as { message?: string })?.message ?? "Edge function failed";
  const ctx = (error as { context?: Response | undefined })?.context;
  if (!ctx || typeof ctx.json !== "function") return fallback;
  try {
    const body = (await ctx.clone().json()) as { error?: string } | null;
    if (body && typeof body.error === "string" && body.error.length > 0) {
      return body.error;
    }
  } catch {
    /* body no es JSON, caer al fallback */
  }
  return fallback;
}

export async function generateScript(input: GenerateScriptInput): Promise<GenerateScriptResult> {
  const { data, error } = await supabase.functions.invoke<GenerateScriptResult | { error: string }>(
    "generate-script",
    { body: input },
  );
  if (error) throw new Error(await extractBackendError(error));
  if (!data) throw new Error("Empty response");
  if ("error" in data) throw new Error(data.error);
  return data as GenerateScriptResult;
}

export async function transcribeAudio(audio_upload_id: string): Promise<{ transcript: string }> {
  const { data, error } = await supabase.functions.invoke<{ transcript: string } | { error: string }>(
    "transcribe-audio",
    { body: { audio_upload_id } },
  );
  if (error) throw new Error(await extractBackendError(error));
  if (!data) throw new Error("Empty response");
  if ("error" in data) throw new Error(data.error);
  return data as { transcript: string };
}
