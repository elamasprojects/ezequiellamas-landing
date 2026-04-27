// Upload rendered slide buffers to the carousel-renders bucket using the
// service role key. Bypasses RLS deliberately -- the worker is trusted via
// HMAC at the perimeter.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;
function admin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("missing_supabase_env_vars");
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

const BUCKET = "carousel-renders";

/**
 * Path scheme: `{owner_id}/{carousel_id}/slide_{NN}.{ext}` (1-indexed, zero-padded).
 */
export function slidePath(opts: {
  ownerId: string;
  carouselId: string;
  index: number; // 0-based
  ext: "png" | "mp4";
}): string {
  const nn = String(opts.index + 1).padStart(2, "0");
  return `${opts.ownerId}/${opts.carouselId}/slide_${nn}.${opts.ext}`;
}

export async function uploadSlide(opts: {
  ownerId: string;
  carouselId: string;
  index: number;
  format: "png" | "mp4";
  buffer: Buffer;
}): Promise<string> {
  const path = slidePath({ ...opts, ext: opts.format });
  const contentType = opts.format === "mp4" ? "video/mp4" : "image/png";

  const { error } = await admin()
    .storage.from(BUCKET)
    .upload(path, opts.buffer, {
      contentType,
      upsert: true,
      cacheControl: "31536000",
    });
  if (error) {
    throw new Error(`upload_failed: ${error.message}`);
  }
  return path;
}
