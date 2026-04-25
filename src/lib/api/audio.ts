import { supabase } from "@/lib/supabase";
import type { Tables, TablesInsert } from "@/lib/database.types";

export type AudioUpload = Tables<"audio_uploads">;
export type AudioUploadInsert = TablesInsert<"audio_uploads">;

const BUCKET = "audio-ideas";

export async function uploadAudio(params: {
  blob: Blob;
  ownerId: string;
  durationSeconds?: number;
}): Promise<AudioUpload> {
  const { blob, ownerId, durationSeconds } = params;
  const ext = inferExtension(blob.type);
  const filename = `${crypto.randomUUID()}.${ext}`;
  const storagePath = `${ownerId}/${filename}`;

  const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(storagePath, blob, {
    contentType: blob.type || "audio/webm",
    cacheControl: "3600",
    upsert: false,
  });
  if (uploadErr) throw uploadErr;

  const { data, error: insertErr } = await supabase
    .from("audio_uploads")
    .insert({
      owner_id: ownerId,
      storage_path: storagePath,
      duration_seconds: durationSeconds ?? null,
      size_bytes: blob.size,
      mime_type: blob.type || "audio/webm",
    })
    .select()
    .single();
  if (insertErr) throw insertErr;
  return data;
}

export async function getAudioUpload(id: string): Promise<AudioUpload | null> {
  const { data, error } = await supabase.from("audio_uploads").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

function inferExtension(mime: string): string {
  if (!mime) return "webm";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("mp3") || mime.includes("mpeg")) return "mp3";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("m4a")) return "m4a";
  return "webm";
}
