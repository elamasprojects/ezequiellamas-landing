// bunny-diagnose: returns the full Bunny Stream metadata for a video plus
// HEAD probes for every advertised MP4 fallback rung. Use this to figure
// out WHY a /play_{height}p.mp4 URL returns 403 in a browser.
//
// Body: { bunny_video_id: string }
// Returns: { video, head_probes, hint }
//
// Auth: requires authenticated admin session (caller must own the request).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method" });

  const auth = req.headers.get("Authorization");
  if (!auth) return json(401, { error: "missing_auth" });

  // Auth check — any logged-in user is fine here.
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: u, error: uErr } = await userClient.auth.getUser();
  if (uErr || !u.user) return json(401, { error: "unauthenticated" });

  const cdnHost = Deno.env.get("BUNNY_CDN_HOSTNAME");
  const libraryId = Deno.env.get("BUNNY_LIBRARY_ID");
  const libraryKey = Deno.env.get("BUNNY_LIBRARY_KEY");
  if (!cdnHost || !libraryId || !libraryKey) {
    return json(500, { error: "bunny_not_configured" });
  }

  let body: { bunny_video_id?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }
  const videoId = body.bunny_video_id?.trim();
  if (!videoId) return json(400, { error: "bunny_video_id required" });

  // 1) Fetch full video metadata from Bunny API.
  let videoMeta: Record<string, unknown> | null = null;
  let videoMetaError: string | null = null;
  try {
    const r = await fetch(
      `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`,
      { headers: { AccessKey: libraryKey, accept: "application/json" } },
    );
    if (!r.ok) {
      videoMetaError = `bunny_api_${r.status}: ${(await r.text()).slice(0, 300)}`;
    } else {
      videoMeta = (await r.json()) as Record<string, unknown>;
    }
  } catch (e) {
    videoMetaError = e instanceof Error ? e.message : String(e);
  }

  // 2) Fetch the library settings (encoding settings live here, not on the
  //    video). This is where MP4Fallback / KeepOriginalFiles / TokenAuth /
  //    Hotlink rules are configured.
  let libraryMeta: Record<string, unknown> | null = null;
  let libraryMetaError: string | null = null;
  try {
    const r = await fetch(
      `https://api.bunny.net/videolibrary/${libraryId}`,
      { headers: { AccessKey: libraryKey, accept: "application/json" } },
    );
    if (!r.ok) {
      // The library-level endpoint requires the *account* API key, not the
      // library-specific key. Don't treat this as fatal — the per-video
      // metadata above usually has enough info.
      libraryMetaError = `library_api_${r.status} (probably need account-level Bunny API key, not library key)`;
    } else {
      libraryMeta = (await r.json()) as Record<string, unknown>;
    }
  } catch (e) {
    libraryMetaError = e instanceof Error ? e.message : String(e);
  }

  // 3) HEAD probe every advertised resolution.
  type Probe = {
    height: number;
    url: string;
    status: number | null;
    server: string | null;
    content_type: string | null;
    content_length: string | null;
    error?: string;
  };
  const probes: Probe[] = [];
  const availableRaw =
    typeof videoMeta?.availableResolutions === "string"
      ? (videoMeta.availableResolutions as string)
      : "";
  const heights = availableRaw
    .split(",")
    .map((s) => s.trim().replace(/p$/i, ""))
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  // Always probe a default rung even if the video doesn't list it — that
  // way we see whether 403 is generic (config) or per-resolution (encoding).
  const allRungs = [...new Set([...heights, 240, 360, 480, 720, 1080])].sort(
    (a, b) => a - b,
  );

  for (const height of allRungs) {
    const url = `https://${cdnHost}/${videoId}/play_${height}p.mp4`;
    try {
      const r = await fetch(url, { method: "HEAD" });
      probes.push({
        height,
        url,
        status: r.status,
        server: r.headers.get("server"),
        content_type: r.headers.get("content-type"),
        content_length: r.headers.get("content-length"),
      });
    } catch (e) {
      probes.push({
        height,
        url,
        status: null,
        server: null,
        content_type: null,
        content_length: null,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // 4) Also probe the HLS playlist — it should always be 200 if the video
  //    encoded successfully and the CDN is configured for public playback.
  let hlsProbe: { url: string; status: number | null; error?: string };
  try {
    const r = await fetch(`https://${cdnHost}/${videoId}/playlist.m3u8`, {
      method: "HEAD",
    });
    hlsProbe = {
      url: `https://${cdnHost}/${videoId}/playlist.m3u8`,
      status: r.status,
    };
  } catch (e) {
    hlsProbe = {
      url: `https://${cdnHost}/${videoId}/playlist.m3u8`,
      status: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  // 5) Heuristic hint based on what we observed.
  const allMp4403 = probes.length > 0 && probes.every((p) => p.status === 403);
  const hlsOk = hlsProbe.status !== null && hlsProbe.status >= 200 && hlsProbe.status < 400;
  const hlsAlso403 = hlsProbe.status === 403;

  let hint = "";
  if (allMp4403 && hlsOk) {
    hint =
      "HLS works, MP4 fallback returns 403 on every height. The library " +
      "DOES NOT have MP4 Fallback enabled (or this video was encoded before " +
      "you turned it on). Fix: bunny.net -> Stream -> your Library -> " +
      "Encoding -> toggle 'Allow MP4 Fallback' ON, save, then in the video's " +
      "row click 'Re-Encode'. Existing videos are NOT auto-reencoded.";
  } else if (allMp4403 && hlsAlso403) {
    hint =
      "HLS and MP4 both return 403. The pull zone is blocking direct " +
      "playback. Most likely culprits: (a) Library -> API tab -> 'Block " +
      "direct URL play' is ON, (b) the pull zone has Hotlink Protection / " +
      "Allowed Referrers restricting your origin, or (c) Token " +
      "Authentication is enabled on the library. Check Stream -> Library " +
      "-> API + the linked Pull Zone -> Security.";
  } else if (probes.some((p) => p.status === 200) && allMp4403 === false) {
    hint =
      "At least one MP4 fallback works. The transcribe edge function " +
      "(v5+) iterates rungs smallest-first and will pick whichever 200s.";
  } else {
    hint =
      "Inconclusive — share this whole JSON with someone who can read " +
      "the Bunny dashboard.";
  }

  return json(200, {
    video: videoMeta ?? { _error: videoMetaError },
    library: libraryMeta ?? { _error: libraryMetaError },
    head_probes: probes,
    hls_probe: hlsProbe,
    hint,
  });
});
