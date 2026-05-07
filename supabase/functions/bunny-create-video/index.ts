// bunny-create-video: creates an empty Bunny Stream video container,
// persists a row in `bunny_videos` (so the user can find it later even if
// they refresh the form mid-encode), and returns a TUS upload signature
// so the browser can upload the file directly.
//
// CDN URL convention is `/{videoId}/play_720p.mp4` (encoded MP4 fallback,
// available once Bunny finishes transcoding). The library must have
// "MP4 Fallback" enabled and Token Authentication / Block Direct URL Play
// disabled — see CLAUDE.md M12.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

async function tusSignature(
  libraryId: string,
  apiKey: string,
  videoId: string,
  expirationTime: number,
): Promise<string> {
  // Per Bunny Stream TUS docs: sha256(libraryId + apiKey + expirationTime + videoId)
  const enc = new TextEncoder();
  const data = enc.encode(`${libraryId}${apiKey}${expirationTime}${videoId}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json(401, { error: "missing_auth" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: uErr } = await userClient.auth.getUser();
    if (uErr || !userData.user) return json(401, { error: "unauthenticated" });
    const userId = userData.user.id;

    const libraryId = Deno.env.get("BUNNY_LIBRARY_ID");
    const libraryKey = Deno.env.get("BUNNY_LIBRARY_KEY");
    const cdnHostname = Deno.env.get("BUNNY_CDN_HOSTNAME");
    if (!libraryId || !libraryKey || !cdnHostname) {
      return json(500, { error: "bunny_not_configured" });
    }

    const body = (await req.json().catch(() => ({}))) as {
      filename?: string;
      title?: string;
    };
    const titleBase =
      (body.title?.trim() ||
        body.filename?.trim() ||
        `video-${new Date().toISOString().slice(0, 10)}`).slice(0, 200);
    const title = `[${userId.slice(0, 8)}] ${titleBase}`;

    // 1) Create empty video in Bunny Stream
    const createRes = await fetch(
      `https://video.bunnycdn.com/library/${libraryId}/videos`,
      {
        method: "POST",
        headers: {
          AccessKey: libraryKey,
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({ title }),
      },
    );
    if (!createRes.ok) {
      const t = await createRes.text();
      return json(502, {
        error: `bunny_create_failed_${createRes.status}: ${t.slice(0, 200)}`,
      });
    }
    const createJson = (await createRes.json()) as { guid?: string };
    if (!createJson.guid) return json(502, { error: "bunny_no_guid" });
    const videoId = createJson.guid;

    // 2) Persist to bunny_videos so the user can find it later. We use service
    //    role to bypass RLS; we already verified the JWT above. INSERT only —
    //    if a duplicate slips in, the unique (library_id, video_id) constraint
    //    will surface it as a 23505.
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: libRow, error: insErr } = await admin
      .from("bunny_videos")
      .insert({
        owner_id: userId,
        bunny_video_id: videoId,
        bunny_library_id: libraryId,
        title: titleBase,
        filename: body.filename ?? null,
        status: "uploading",
      })
      .select("id")
      .single();
    if (insErr) {
      // Surface but don't fail — the Bunny video was already created. The
      // user can still upload; library backfill can pick it up later.
      console.warn("bunny_videos_insert_failed", insErr);
    }

    // 3) Build TUS signature (1 hour TTL)
    const expirationTime = Math.floor(Date.now() / 1000) + 3600;
    const signature = await tusSignature(libraryId, libraryKey, videoId, expirationTime);

    // 4) CDN URLs (MP4 fallback once encoded; HLS is available earlier)
    const cdnUrl = `https://${cdnHostname}/${videoId}/play_720p.mp4`;
    const hlsUrl = `https://${cdnHostname}/${videoId}/playlist.m3u8`;
    const thumbnailUrl = `https://${cdnHostname}/${videoId}/thumbnail.jpg`;

    return json(200, {
      ok: true,
      bunny_videos_id: libRow?.id ?? null,
      video_id: videoId,
      library_id: libraryId,
      upload_url: "https://video.bunnycdn.com/tusupload",
      auth_signature: signature,
      auth_expiration_time: expirationTime,
      cdn_url: cdnUrl,
      hls_url: hlsUrl,
      thumbnail_url: thumbnailUrl,
      cdn_hostname: cdnHostname,
    });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : "unknown" });
  }
});
