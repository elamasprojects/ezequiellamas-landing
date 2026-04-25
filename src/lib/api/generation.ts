import { supabase } from "@/lib/supabase";

export interface GenerateScriptInput {
  audio_upload_id?: string;
  raw_concept?: string;
  format_id?: string;
}

export interface GenerateScriptResult {
  script_id: string;
}

export async function generateScript(input: GenerateScriptInput): Promise<GenerateScriptResult> {
  const { data, error } = await supabase.functions.invoke<GenerateScriptResult | { error: string }>(
    "generate-script",
    { body: input },
  );
  if (error) throw new Error(error.message ?? "Edge function failed");
  if (!data) throw new Error("Empty response");
  if ("error" in data) throw new Error(data.error);
  return data as GenerateScriptResult;
}

export async function transcribeAudio(audio_upload_id: string): Promise<{ transcript: string }> {
  const { data, error } = await supabase.functions.invoke<{ transcript: string } | { error: string }>(
    "transcribe-audio",
    { body: { audio_upload_id } },
  );
  if (error) throw new Error(error.message ?? "Edge function failed");
  if (!data) throw new Error("Empty response");
  if ("error" in data) throw new Error(data.error);
  return data as { transcript: string };
}
