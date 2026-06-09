import * as tus from "tus-js-client";
import { supabase } from "@/lib/supabase";

/** Shared Bunny Stream TUS upload, reused by the single-post uploader and the batch flow. */

export interface BunnyUploadResult {
  bunny_video_id: string;
  bunny_library_id: string;
  cdn_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  mime_type: string;
}

interface CreateBunnyResponse {
  ok: true;
  bunny_videos_id: string | null;
  video_id: string;
  library_id: string;
  upload_url: string;
  auth_signature: string;
  auth_expiration_time: number;
  cdn_url: string;
  hls_url?: string;
  thumbnail_url?: string;
  cdn_hostname: string;
}

export const BUNNY_MAX_BYTES = 5 * 1024 * 1024 * 1024;
export const BUNNY_ACCEPTED = "video/mp4,video/quicktime,video/webm";

/** Reads a video file's duration (seconds) from its metadata, or null on failure. */
export function probeVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      const d = isFinite(v.duration) ? v.duration : null;
      URL.revokeObjectURL(url);
      resolve(d);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    v.src = url;
  });
}

export interface UploadToBunnyOptions {
  /** 0–100 progress callback. */
  onProgress?: (pct: number) => void;
  /** Receives the tus.Upload so the caller can abort. */
  onStart?: (upload: tus.Upload) => void;
  /** Pre-probed duration; if omitted it's probed here. */
  duration?: number | null;
}

/**
 * Creates a Bunny video and uploads `file` to it via TUS. Resolves once the
 * upload completes (encoding then continues server-side). Rejects on any error.
 */
export async function uploadToBunny(
  file: File,
  opts: UploadToBunnyOptions = {},
): Promise<BunnyUploadResult> {
  const duration =
    opts.duration !== undefined ? opts.duration : await probeVideoDuration(file);

  const { data, error: fnErr } = await supabase.functions.invoke<
    CreateBunnyResponse | { error: string }
  >("bunny-create-video", {
    body: { filename: file.name, title: file.name.replace(/\.[^.]+$/, "") },
  });
  if (fnErr) throw new Error(fnErr.message);
  if (!data) throw new Error("empty_response");
  if ("error" in data) throw new Error(data.error);
  const createResp = data;

  return new Promise<BunnyUploadResult>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: createResp.upload_url,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        AuthorizationSignature: createResp.auth_signature,
        AuthorizationExpire: String(createResp.auth_expiration_time),
        VideoId: createResp.video_id,
        LibraryId: createResp.library_id,
      },
      metadata: { filetype: file.type, title: file.name },
      chunkSize: 15 * 1024 * 1024,
      parallelUploads: 1,
      onError: (err) => reject(err instanceof Error ? err : new Error(String(err))),
      onProgress: (bytesUploaded, bytesTotal) => {
        opts.onProgress?.((bytesUploaded / bytesTotal) * 100);
      },
      onSuccess: () => {
        resolve({
          bunny_video_id: createResp.video_id,
          bunny_library_id: createResp.library_id,
          cdn_url: createResp.cdn_url,
          thumbnail_url: createResp.thumbnail_url ?? null,
          duration_seconds: duration,
          mime_type: file.type,
        });
      },
    });
    opts.onStart?.(upload);
    upload.start();
  });
}
