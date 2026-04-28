import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { PublishPlatform } from "@/lib/publishing/platformLimits";

async function unwrapError(error: unknown): Promise<never> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as { error?: string };
      if (body?.error) throw new Error(body.error);
    } catch (e) {
      if (e instanceof Error && e.message) throw e;
    }
  }
  throw new Error(error instanceof Error ? error.message : String(error));
}

// ──────────────────────────────────────────────────────────────────────────
// transcribe-bunny-video
// ──────────────────────────────────────────────────────────────────────────

export interface TranscribeBunnyInput {
  /** Bunny Stream video GUID (Bunny provider). */
  bunny_video_id?: string;
  /** Supabase Storage path inside videos-final (Supabase provider). */
  video_storage_path?: string;
  scheduled_post_id?: string;
  language?: string;
  force?: boolean;
}

export interface TranscribeBunnyResult {
  ok: true;
  transcript: string;
  language: string | null;
  duration_seconds: number | null;
  cached?: boolean;
}

export class TranscribeError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

export async function transcribeBunnyVideo(
  input: TranscribeBunnyInput,
): Promise<TranscribeBunnyResult> {
  const { data, error } = await supabase.functions.invoke<
    TranscribeBunnyResult | { error: string }
  >("transcribe-bunny-video", { body: input });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const body = (await error.context.json()) as { error?: string };
        if (body?.error) throw new TranscribeError(body.error, body.error);
      } catch (e) {
        if (e instanceof TranscribeError) throw e;
      }
    }
    await unwrapError(error);
  }
  if (!data) throw new Error("empty_response");
  if ("error" in data) throw new TranscribeError(data.error, data.error);
  return data;
}

// ──────────────────────────────────────────────────────────────────────────
// generate-captions
// ──────────────────────────────────────────────────────────────────────────

export interface GenerateCaptionsInput {
  bunny_video_id?: string;
  video_storage_path?: string;
  scheduled_post_id?: string;
  transcript?: string;
  platforms?: PublishPlatform[];
  format_id?: string | null;
  force_regenerate?: boolean;
}

export interface GenerateCaptionsResult {
  ok: true;
  caption_default: string;
  captions: Partial<Record<PublishPlatform, string>>;
  youtube_title: string;
  hashtags: string[];
  used_format: boolean;
}

export async function generateCaptions(
  input: GenerateCaptionsInput,
): Promise<GenerateCaptionsResult> {
  const { data, error } = await supabase.functions.invoke<
    GenerateCaptionsResult | { error: string }
  >("generate-captions", { body: input });
  if (error) await unwrapError(error);
  if (!data) throw new Error("empty_response");
  if ("error" in data) throw new Error(data.error);
  return data;
}
