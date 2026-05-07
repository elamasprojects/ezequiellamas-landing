// transcribe-bunny-video: transcribes a video via OpenAI Whisper-1.
// Two providers supported:
//   - Bunny Stream: tries the public CDN MP4 fallback URLs directly (URL-first
//     probe). If none are reachable yet, falls back to the Bunny API status
//     check to differentiate "still encoding" (retryable) from "encode failed"
//     (fatal) or "no MP4 fallback" (config issue).
//   - Supabase Storage: downloads the file from the videos-final bucket
//     using the service-role client.
// Caches the transcript on `bunny_videos` (shared across scheduled_posts that
// reuse the same video) and stamps `scheduled_posts` for back-compat.
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

// Resolution rungs to probe, smallest-first to keep Whisper download light.
const RESOLUTION_RUNG = [240, 360, 480, 720, 1080];

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

async function loadBunnyVideoCache(
  admin: SupabaseClient,
  libraryId: string,
  bunnyVideoId: string,
): Promise<{
  transcript: string | null;
  transcript_language: string | null;
  transcript_status: string;
} | null> {
  const { data } = await admin
    .from("bunny_videos")
    .select("transcript, transcript_language, transcript_status")
    .eq("bunny_library_id", libraryId)
    .eq("bunny_video_id", bunnyVideoId)
    .maybeSingle();
  return data as never;
}

async function updateBunnyVideo(
  admin: SupabaseClient,
  libraryId: string,
  bunnyVideoId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  await admin
    .from("bunny_videos")
    .update(patch)
    .eq("bunny_library_id", libraryId)
    .eq("bunny_video_id", bunnyVideoId);
}

// Bunny statuses: 0=Created, 1=Uploaded, 2=Processing, 3=Transcoding,
// 4=Finished, 5=Error, 6=UploadFailed.
async function bunnyApiStatus(
  libraryId: string,
  apiKey: string,
  videoId: string,
): Promise<{ status: number | null; availableResolutions: string | null; error?: string }> {
  try {
    const r = await fetch(
      `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`,
      { headers: { AccessKey: apiKey, accept: "application/json" } },
    );
    if (!r.ok) {
      return {
        status: null,
        availableResolutions: null,
        error: `bunny_api_${r.status}`,
      };
    }
    const j = (await r.json()) as { status?: number; availableResolutions?: string };
    return {
      status: typeof j.status === "number" ? j.status : null,
      availableResolutions: typeof j.availableResolutions === "string" ? j.availableResolutions : null,
    };
  } catch (e) {
    return {
      status: null,
      availableResolutions: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function parseResolutions(raw: string | null): number[] {
  if (!raw) return [...RESOLUTION_RUNG];
  const heights = raw
    .split(",")
    .map((s) => s.trim().replace(/p$/i, ""))
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (heights.length === 0) return [...RESOLUTION_RUNG];
  return [...new Set(heights)].sort((a, b) => a - b);
}

/**
 * Try each public CDN URL (smallest-first). Returns the first 200, or null if
 * all probes fail. Does NOT touch the Bunny API.
 */
async function probeCdnRungs(
  cdnHost: string,
  bunnyVideoId: string,
  rungs: number[],
): Promise<
  | { found: { height: number; url: string; contentLength: number } }
  | { found: null; attempts: Array<{ height: number; status: number }> }
> {
  const attempts: Array<{ height: number; status: number }> = [];
  for (const height of rungs) {
    const url = `https://${cdnHost}/${bunnyVideoId}/play_${height}p.mp4`;
    try {
      const r = await fetch(url, { method: "HEAD" });
      attempts.push({ height, status: r.status });
      if (r.ok) {
        const contentLength = Number(r.headers.get("content-length") ?? "0");
        return { found: { height, url, contentLength } };
      }
    } catch (e) {
      attempts.push({ height, status: 0 });
      console.warn(`bunny_head_threw ${height}p: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { found: null, attempts };
}

/** Fetch a Bunny CDN MP4 fallback into a Blob. URL-first; API as diagnostic fallback. */
async function fetchBunnyBlob(
  cdnHost: string,
  bunnyVideoId: string,
  libraryId: string,
  libraryKey: string,
  scheduledPostId: string | null,
  admin: SupabaseClient,
): Promise<{ blob: Blob } | { error: { status: number; body: unknown } }> {
  // Fast path: probe public CDN URLs directly. If any returns 200, we're done.
  const initialProbe = await probeCdnRungs(cdnHost, bunnyVideoId, RESOLUTION_RUNG);

  let workingUrl: { height: number; url: string; contentLength: number } | null = null;
  let attempts: Array<{ height: number; status: number }> = [];
  if ("found" in initialProbe && initialProbe.found) {
    workingUrl = initialProbe.found;
  } else if ("attempts" in initialProbe) {
    attempts = initialProbe.attempts;
  }

  // Slow path: nothing reachable yet — ask the API why and try the rungs the
  // library actually advertises if encoding finished. Distinguishes
  // "encoding-in-progress" (retryable 503) from "encode failed" (502 fatal)
  // from "fallback disabled" (502 with diagnostic).
  if (!workingUrl) {
    const apiInfo = await bunnyApiStatus(libraryId, libraryKey, bunnyVideoId);
    if (apiInfo.status === 4) {
      // Encoding done but our default rungs all 4xx'd — try the API's
      // advertised resolutions.
      const apiRungs = parseResolutions(apiInfo.availableResolutions);
      const apiProbe = await probeCdnRungs(cdnHost, bunnyVideoId, apiRungs);
      if ("found" in apiProbe && apiProbe.found) {
        workingUrl = apiProbe.found;
      } else if ("attempts" in apiProbe) {
        attempts = [...attempts, ...apiProbe.attempts];
      }
      if (!workingUrl) {
        const diagnostics = {
          library_id: libraryId,
          bunny_video_id: bunnyVideoId,
          available_resolutions: apiInfo.availableResolutions,
          attempts,
          hint:
            "Encoding finished (status=4) but every MP4 fallback URL returned " +
            "non-2xx. Most likely fix: enable 'MP4 Fallback' in bunny.net → " +
            "Stream → Library → Encoding Settings, then re-encode this video.",
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
        await updateBunnyVideo(admin, libraryId, bunnyVideoId, {
          transcript_status: "failed",
          transcript_error: "bunny_no_mp4_fallback_available",
        });
        return {
          error: { status: 502, body: { error: "bunny_no_mp4_fallback_available", diagnostics } },
        };
      }
    } else if (apiInfo.status === 5 || apiInfo.status === 6) {
      const errMsg = `bunny_encode_failed_${apiInfo.status}`;
      if (scheduledPostId) {
        await admin
          .from("scheduled_posts")
          .update({ transcript_status: "failed", transcript_error: errMsg })
          .eq("id", scheduledPostId);
      }
      await updateBunnyVideo(admin, libraryId, bunnyVideoId, {
        transcript_status: "failed",
        transcript_error: errMsg,
      });
      return {
        error: {
          status: 502,
          body: { error: errMsg, bunny_status: apiInfo.status, retryable: false },
        },
      };
    } else {
      // status 0/1/2/3 (still encoding) or null (API call failed) — retryable.
      const errMsg = "bunny_encoding_in_progress";
      if (scheduledPostId) {
        await admin
          .from("scheduled_posts")
          .update({ transcript_status: "pending", transcript_error: errMsg })
          .eq("id", scheduledPostId);
      }
      await updateBunnyVideo(admin, libraryId, bunnyVideoId, {
        transcript_status: "pending",
        transcript_error: errMsg,
      });
      return {
        error: {
          status: 503,
          body: {
            error: errMsg,
            bunny_status: apiInfo.status,
            retryable: true,
            retry_after_seconds: 30,
          },
        },
      };
    }
  }

  // We have a working URL. Verify size, then GET.
  if (workingUrl.contentLength > MAX_BYTES) {
    const errMsg = `${workingUrl.contentLength} bytes > ${MAX_BYTES} (height=${workingUrl.height}p)`;
    if (scheduledPostId) {
      await admin
        .from("scheduled_posts")
        .update({ transcript_status: "too_large", transcript_error: errMsg })
        .eq("id", scheduledPostId);
    }
    await updateBunnyVideo(admin, libraryId, bunnyVideoId, {
      transcript_status: "too_large",
      transcript_error: errMsg,
    });
    return {
      error: {
        status: 422,
        body: {
          error: "video_too_large_for_whisper",
          max_bytes: MAX_BYTES,
          actual_bytes: workingUrl.contentLength,
          tried_height: workingUrl.height,
        },
      },
    };
  }

  const getRes = await fetch(workingUrl.url);
  if (!getRes.ok) {
    const errMsg = `bunny_get_${getRes.status}_at_${workingUrl.height}p`;
    if (scheduledPostId) {
      await admin
        .from("scheduled_posts")
        .update({ transcript_status: "failed", transcript_error: errMsg })
        .eq("id", scheduledPostId);
    }
    await updateBunnyVideo(admin, libraryId, bunnyVideoId, {
      transcript_status: "failed",
      transcript_error: errMsg,
    });
    return { error: { status: 502, body: { error: errMsg } } };
  }
  return { blob: await getRes.blob() };
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

    // Shared cache: if this Bunny video was already transcribed in another
    // scheduled_post, reuse the transcript. Only the bunny_video_id path has
    // shared cache (Supabase Storage paths are per-upload).
    const libraryId = Deno.env.get("BUNNY_LIBRARY_ID");
    if (bunnyVideoId && libraryId && !body.force) {
      const cached = await loadBunnyVideoCache(admin, libraryId, bunnyVideoId);
      if (cached?.transcript && cached.transcript_status === "done") {
        if (scheduledPostId) {
          await admin
            .from("scheduled_posts")
            .update({
              transcript: cached.transcript,
              transcript_language: cached.transcript_language,
              transcript_status: "done",
              transcript_error: null,
            })
            .eq("id", scheduledPostId);
        }
        return json(200, {
          ok: true,
          transcript: cached.transcript,
          language: cached.transcript_language,
          duration_seconds: null,
          cached: true,
          cache_source: "bunny_videos",
        });
      }
    }

    if (scheduledPostId) {
      await admin
        .from("scheduled_posts")
        .update({ transcript_status: "pending", transcript_error: null })
        .eq("id", scheduledPostId);
    }
    if (bunnyVideoId && libraryId) {
      await updateBunnyVideo(admin, libraryId, bunnyVideoId, {
        transcript_status: "pending",
        transcript_error: null,
      });
    }

    let blobResult: { blob: Blob } | { error: { status: number; body: unknown } };
    if (storagePath) {
      blobResult = await fetchStorageBlob(admin, storagePath, scheduledPostId);
    } else {
      const cdnHost = Deno.env.get("BUNNY_CDN_HOSTNAME");
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
      if (bunnyVideoId && libraryId) {
        await updateBunnyVideo(admin, libraryId, bunnyVideoId, {
          transcript_status: "failed",
          transcript_error: msg,
        });
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
    if (bunnyVideoId && libraryId) {
      await updateBunnyVideo(admin, libraryId, bunnyVideoId, {
        transcript: result.text,
        transcript_language: result.language,
        transcript_status: "done",
        transcript_error: null,
      });
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
