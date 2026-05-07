// Upload rendered slide / broll buffers to Supabase Storage using the
// service role key. Bypasses RLS deliberately -- the worker is trusted via
// HMAC at the perimeter.

import { admin } from "./db.js";

const CAROUSEL_BUCKET = "carousel-renders";
const BROLL_BUCKET = "broll-renders";

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
    .storage.from(CAROUSEL_BUCKET)
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

/**
 * Path scheme para B-rolls: `{owner_id}/{broll_id}.mp4`.
 * Distinto del de carruseles que tiene un nivel de slide_NN — cada broll es
 * un único MP4.
 */
export function brollPath(opts: { ownerId: string; brollId: string; ext: "mp4" | "png" }): string {
  return `${opts.ownerId}/${opts.brollId}.${opts.ext}`;
}

export async function uploadBroll(opts: {
  ownerId: string;
  brollId: string;
  ext: "mp4" | "png";
  buffer: Buffer;
}): Promise<string> {
  const path = brollPath(opts);
  const contentType = opts.ext === "mp4" ? "video/mp4" : "image/png";

  const { error } = await admin()
    .storage.from(BROLL_BUCKET)
    .upload(path, opts.buffer, {
      contentType,
      upsert: true,
      cacheControl: "31536000",
    });
  if (error) {
    throw new Error(`broll_upload_failed: ${error.message}`);
  }
  return path;
}

/** Sign a broll-renders path with TTL (seconds). Default: 30 days. */
export async function signBrollUrl(path: string, ttlSeconds = 60 * 60 * 24 * 30): Promise<string> {
  const { data, error } = await admin().storage.from(BROLL_BUCKET).createSignedUrl(path, ttlSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(`broll_sign_failed: ${error?.message ?? "no_signed_url"}`);
  }
  return data.signedUrl;
}
