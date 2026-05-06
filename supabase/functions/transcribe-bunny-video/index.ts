// transcribe-bunny-video: transcribes a video via OpenAI Whisper-1.
// Two providers supported:
//   - Bunny Stream: downloads an MP4 fallback from the Bunny CDN. Probes
//     the `availableResolutions` reported by the Bunny API and tries each
//     `/play_{height}p.mp4` URL until one returns 200 (smallest first to
//     keep the Whisper download light). Waits for transcoding status=4
//     before downloading, since fallbacks only exist once encoding finishes.
//   - Supabase Storage: downloads the file from the videos-final bucket
//     using the service-role client.
// Caches the transcript on scheduled_posts when scheduled_post_id is given.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_BYTES = 25 * 1024 * 1024; // OpenAI Whisper API limit
const SUPABASE_VIDEOS_BUCKET = "videos-final";

// Fallback rung if the Bunny API's availableResolutions field is missing or
// malformed. We try smallest-first to minimize Whisper download size.
const FALLBACK_RESOLUTION_RUNG = [240, 360, 480, 720, 1080, 1440, 2160];

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

interface Body {
  scheduled_post_id?: string;
  bunny_video_id?: string;
  video_storage_path?: string;
  language?: string;
  force?: boolean;
}

async function whisperTranscribe(
  blob: Blob,
  language: string | undefined,
  apiKey: string,
): Promise<{ text: string; language: string | null; duration: number | null }> {
  const fd = new FormData();
  fd.append("file", blob, "video.mp4");
  fd.append("model", "whisper-1");
  fd.append("response_format", "verbose_json");
  if (language && language !== "auto") fd.append("language", language);

  const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: fd,
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`whisper_${r.status}: ${t.slice(0, 200)}`);
  }
  const j = (await r.json()) as { text?: string; language?: string; duration?: number };
  if (!j.text) throw new Error("whisper_empty_text");
  return { text: j.text, language: j.language ?? null, duration: j.duration ?? null };
}

async function loadScheduledPost(
  admin: SupabaseClient,
  id: string,
): Promise<{
  id: string;
  owner_id: string;
  bunny_video_id: string | null;
  video_storage_path: string | null;
  transcript: string | null;
  transcript_status: string;
} | null> {
  const { data, error } = await admin
    .from("scheduled_posts")
    .select("id, owner_id, bunny_video_id, video_storage_path, transcript, transcript_status")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as never;
}

// Bunny statuses: 0=Created, 1=Uploaded, 2=Processing, 3=Transcoding,
// 4=Finished, 5=Error, 6=UploadFailed.
async function waitForBunnyEncoding(
  libraryId: string,
  apiKey: string,
  videoId: string,
  maxWaitMs = 60_000,
): Promise<{
  status: number | null;
  availableResolutions: string | null;
  error?: string;
}> {
  const deadline = Date.now() + maxWaitMs;
  let lastStatus: number | null = null;
  let lastResolutions: string | null = null;
  while (Date.now() < deadline) {
    const r = await fetch(
      `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`,
      { headers: { AccessKey: apiKey, accept: "application/json" } },
    );
    if (!r.ok) {
      return {
        status: lastStatus,
        availableResolutions: lastResolutions,
        error: `bunny_api_${r.status}`,
      };
    }
    const j = (await r.json()) as {
      status?: number;
      availableResolutions?: string;
    };
    lastStatus = typeof j.status === "number" ? j.status : null;
    lastResolutions = typeof j.availableResolutions === "string" ? j.availableResolutions : null;
    if (lastStatus === 4) {
      return { status: 4, availableResolutions: lastResolutions };
    }
    if (lastStatus === 5 || lastStatus === 6) {
      return {
        status: lastStatus,
        availableResolutions: lastResolutions,
        error: `bunny_encode_${lastStatus}`,
      };
    }
    await new Promise((res) => setTimeout(res, 5000));
  }
  return {
    status: lastStatus,
    availableResolutions: lastResolutions,
    error: "bunny_encode_timeout",
  };
}

/**
 * Parse Bunny's `availableResolutions` CSV (e.g. "240p,360p,720p") into
 * a sorted list of heights, smallest first. Falls back to a default rung
 * if the field is missing/empty/unparseable.
 */
function parseResolutions(raw: string | null): number[] {
  if (!raw) return [...FALLBACK_RESOLUTION_RUNG];
  const heights = raw
    .split(",")
    .map((s) => s.trim().replace(/p$/i, ""))
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (heights.length === 0) return [...FALLBACK_RESOLUTION_RUNG];
  // Smallest first: keeps Whisper download under the 25MB cap when possible.
  return [...new Set(heights)].sort((a, b) => a - b);
}

/** Fetch a Bunny CDN MP4 fallback into a Blob. */
async function fetchBunnyBlob(
  cdnHost: string,
  bunnyVideoId: string,
  libraryId: string,
  libraryKey: string,
  scheduledPostId: string | null,
  admin: SupabaseClient,
): Promise<{ blob: Blob } | { error: { status: number; body: unknown } }> {
  const encodeCheck = await waitForBunnyEncoding(libraryId, libraryKey, bunnyVideoId);
  if (encodeCheck.status !== 4) {
    const errMsg = encodeCheck.error ?? "bunny_not_ready";
    const isTimeout = encodeCheck.error === "bunny_encode_timeout";
    if (scheduledPostId) {
      await admin
        .from("scheduled_posts")
        .update({
          transcript_status: isTimeout ? "pending" : "failed",
          transcript_error: errMsg,
        })
        .eq("id", scheduledPostId);
    }
    return {
      error: {
        status: isTimeout ? 503 : 502,
        body: { error: errMsg, bunny_status: encodeCheck.status, retryable: isTimeout },
      },
    };
  }

  const resolutions = parseResolutions(encodeCheck.availableResolutions);
  const attempts: Array<{ height: number; status: number; url: string }> = [];

  // Try each resolution. First one that returns 2xx on HEAD wins.
  for (const height of resolutions) {
    const cdnUrl = `https://${cdnHost}/${bunnyVideoId}/play_${height}p.mp4`;
    let headRes: Response;
    try {
      headRes = await fetch(cdnUrl, { method: "HEAD" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      attempts.push({ height, status: 0, url: cdnUrl });
      console.warn(`bunny_head_fetch_threw ${height}p: ${msg}`);
      continue;
    }
    attempts.push({ height, status: headRes.status, url: cdnUrl });
    if (!headRes.ok) continue;

    // Found a working fallback. Verify size is under Whisper's limit before
    // downloading to spare bandwidth on giant 1080p files when a 240p exists.
    const contentLength = Number(headRes.headers.get("content-length") ?? "0");
    if (contentLength > MAX_BYTES) {
      // This rung is too big — keep looking for a smaller fallback in case
      // we accidentally walked from low→high; otherwise, surface too_large.
      console.warn(`bunny_${height}p_too_large: ${contentLength} bytes`);
      // Don't `continue` blindly — if we already iterated smallest-first,
      // every subsequent rung will also be too big. Surface the error.
      if (scheduledPostId) {
        await admin
          .from("scheduled_posts")
          .update({
            transcript_status: "too_large",
            transcript_error: `${contentLength} bytes > ${MAX_BYTES} (height=${height}p)`,
          })
          .eq("id", scheduledPostId);
      }
      return {
        error: {
          status: 422,
          body: {
            error: "video_too_large_for_whisper",
            max_bytes: MAX_BYTES,
            actual_bytes: contentLength,
            tried_height: height,
          },
        },
      };
    }

    const getRes = await fetch(cdnUrl);
    if (!getRes.ok) {
      const msg = `bunny_get_${getRes.status}_at_${height}p`;
      console.warn(msg);
      // Could be a transient flake — keep trying other heights.
      attempts.push({ height, status: getRes.status, url: cdnUrl });
      continue;
    }
    return { blob: await getRes.blob() };
  }

  // No resolution worked. Most common cause: MP4 Fallback is disabled in
  // the Bunny library's encoding settings, so /play_{height}p.mp4 returns
  // 403 for every rung even though encoding finished.
  const diagnostics = {
    library_id: libraryId,
    bunny_video_id: bunnyVideoId,
    available_resolutions: encodeCheck.availableResolutions,
    attempts,
    hint:
      "All MP4 fallback URLs returned non-2xx. Most likely fix: enable " +
      "'MP4 Fallback' in bunny.net → Stream → Library → Encoding Settings, " +
      "then re-encode this video (existing videos are not re-encoded " +
      "automatically — you can trigger Re-Encode from the Bunny dashboard).",
  };
  console.error("bunny_no_fallback_available", diagnostics);
  if (scheduledPostId) {
    await admin
      .from("scheduled_posts")
      .update({
        transcript_status: "failed",
        transcript_error: "bunny_no_mp4_fallback_available",
      })
      .eq("id", scheduledPostId);
  }
  return {
    error: {
      status: 502,
      body: {
        error: "bunny_no_mp4_fallback_available",
        diagnostics,
      },
    },
  };
}

/** Fetch a video from the Supabase Storage videos-final bucket. */
async function fetchStorageBlob(
  admin: SupabaseClient,
  storagePath: string,
  scheduledPostId: string | null,
): Promise<{ blob: Blob } | { error: { status: number; body: unknown } }> {
  const { data, error } = await admin.storage
    .from(SUPABASE_VIDEOS_BUCKET)
    .download(storagePath);
  if (error || !data) {
    const msg = error?.message ?? "storage_download_failed";
    if (scheduledPostId) {
      await admin
        .from("scheduled_posts")
        .update({ transcript_status: "failed", transcript_error: msg })
        .eq("id", scheduledPostId);
    }
    return { error: { status: 502, body: { error: msg } } };
  }
  if (data.size > MAX_BYTES) {
    if (scheduledPostId) {
      await admin
        .from("scheduled_posts")
        .update({
          transcript_status: "too_large",
          transcript_error: `${data.size} bytes > ${MAX_BYTES}`,
        })
        .eq("id", scheduledPostId);
    }
    return {
      error: {
        status: 422,
        body: {
          error: "video_too_large_for_whisper",
          max_bytes: MAX_BYTES,
          actual_bytes: data.size,
        },
      },
    };
  }
  return { blob: data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method" });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json(401, { error: "missing_auth" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const isService = auth === `Bearer ${serviceKey}`;

    const admin = createClient(supabaseUrl, serviceKey);

    let userId: string | null = null;
    if (!isService) {
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: auth } },
      });
      const { data: u, error: uErr } = await userClient.auth.getUser();
      if (uErr || !u.user) return json(401, { error: "unauthenticated" });
      userId = u.user.id;
    }

    const body = (await req.json()) as Body;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return json(500, { error: "OPENAI_API_KEY not set" });

    let bunnyVideoId = body.bunny_video_id ?? null;
    let storagePath = body.video_storage_path ?? null;
    const scheduledPostId = body.scheduled_post_id ?? null;
    let scheduledPost: Awaited<ReturnType<typeof loadScheduledPost>> = null;

    if (scheduledPostId) {
      scheduledPost = await loadScheduledPost(admin, scheduledPostId);
      if (!scheduledPost) return json(404, { error: "scheduled_post_not_found" });
      if (!isService && scheduledPost.owner_id !== userId) return json(403, { error: "forbidden" });
      if (!bunnyVideoId) bunnyVideoId = scheduledPost.bunny_video_id;
      if (!storagePath) storagePath = scheduledPost.video_storage_path;

      if (
        !body.force &&
        scheduledPost.transcript &&
        scheduledPost.transcript_status === "done"
      ) {
        return json(200, {
          ok: true,
          transcript: scheduledPost.transcript,
          language: null,
          duration_seconds: null,
          cached: true,
        });
      }
    }

    if (!bunnyVideoId && !storagePath) {
      return json(400, { error: "missing_video_source" });
    }

    if (scheduledPostId) {
      await admin
        .from("scheduled_posts")
        .update({ transcript_status: "pending", transcript_error: null })
        .eq("id", scheduledPostId);
    }

    let blobResult: { blob: Blob } | { error: { status: number; body: unknown } };
    if (storagePath) {
      // Supabase provider — RLS already enforced via scheduledPost.owner_id check
      // when scheduledPostId is supplied. For the pre-submit path (no scheduled_post_id)
      // we trust the caller: the user uploaded with their session and owns the
      // path, and the bucket RLS enforces folder ownership on read anyway when
      // not using service-role (we use service-role here to bypass-with-purpose).
      blobResult = await fetchStorageBlob(admin, storagePath, scheduledPostId);
    } else {
      const cdnHost = Deno.env.get("BUNNY_CDN_HOSTNAME");
      const libraryId = Deno.env.get("BUNNY_LIBRARY_ID");
      const libraryKey = Deno.env.get("BUNNY_LIBRARY_KEY");
      if (!cdnHost) return json(500, { error: "BUNNY_CDN_HOSTNAME not set" });
      if (!libraryId || !libraryKey) return json(500, { error: "bunny_not_configured" });
      blobResult = await fetchBunnyBlob(
        cdnHost,
        bunnyVideoId!,
        libraryId,
        libraryKey,
        scheduledPostId,
        admin,
      );
    }

    if ("error" in blobResult) {
      return json(blobResult.error.status, blobResult.error.body);
    }
    const blob = blobResult.blob;

    let result: Awaited<ReturnType<typeof whisperTranscribe>>;
    try {
      result = await whisperTranscribe(blob, body.language, openaiKey);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (scheduledPostId) {
        await admin
          .from("scheduled_posts")
          .update({ transcript_status: "failed", transcript_error: msg })
          .eq("id", scheduledPostId);
      }
      return json(502, { error: msg });
    }

    if (scheduledPostId) {
      await admin
        .from("scheduled_posts")
        .update({
          transcript: result.text,
          transcript_language: result.language,
          transcript_status: "done",
          transcript_error: null,
        })
        .eq("id", scheduledPostId);
    }

    return json(200, {
      ok: true,
      transcript: result.text,
      language: result.language,
      duration_seconds: result.duration,
      cached: false,
    });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : "unknown" });
  }
});
