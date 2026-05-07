// bunny-refresh-video: pollea el status de uno o varios videos en Bunny y
// actualiza la fila correspondiente en `bunny_videos`. El cliente lo invoca
// cuando abre el picker (sin args = refrescar todos los pendientes del user
// que no se hayan polleado en los últimos 10s).
//
// Body:
//   { bunny_video_id?: string }   — refresca un video específico del user
//   { all_pending?: true }        — refresca todos los uploading/encoding del user
//                                    (con throttle de 10s vía last_polled_at)
//
// Auth: requiere JWT de admin del user dueño.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

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

interface BunnyVideoMeta {
  guid?: string;
  status?: number;
  length?: number;
  width?: number;
  height?: number;
  storageSize?: number;
  availableResolutions?: string;
  encodeProgress?: number;
  thumbnailFileName?: string;
}

// Bunny statuses: 0=Created, 1=Uploaded, 2=Processing, 3=Transcoding,
// 4=Finished, 5=Error, 6=UploadFailed.
function mapBunnyStatus(s: number | undefined): "uploading" | "encoding" | "ready" | "failed" {
  if (s === 4) return "ready";
  if (s === 5 || s === 6) return "failed";
  if (s === 0 || s === 1) return "uploading";
  return "encoding";
}

async function refreshOne(
  admin: SupabaseClient,
  cdnHost: string,
  libraryId: string,
  libraryKey: string,
  videoId: string,
): Promise<{ ok: boolean; row?: unknown; error?: string }> {
  const r = await fetch(
    `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`,
    { headers: { AccessKey: libraryKey, accept: "application/json" } },
  );
  if (!r.ok) {
    const detail = (await r.text()).slice(0, 200);
    // Stamp last_polled_at so we don't keep hammering on a 404'd video
    await admin
      .from("bunny_videos")
      .update({ last_polled_at: new Date().toISOString() })
      .eq("bunny_library_id", libraryId)
      .eq("bunny_video_id", videoId);
    return { ok: false, error: `bunny_${r.status}: ${detail}` };
  }
  const meta = (await r.json()) as BunnyVideoMeta;
  const status = mapBunnyStatus(meta.status);
  const thumbFile = meta.thumbnailFileName ?? "thumbnail.jpg";
  const update: Record<string, unknown> = {
    status,
    duration_seconds: typeof meta.length === "number" ? meta.length : null,
    width: typeof meta.width === "number" ? meta.width : null,
    height: typeof meta.height === "number" ? meta.height : null,
    size_bytes: typeof meta.storageSize === "number" ? meta.storageSize : null,
    available_resolutions: meta.availableResolutions ?? null,
    encode_progress: typeof meta.encodeProgress === "number" ? meta.encodeProgress : null,
    thumbnail_url: `https://${cdnHost}/${videoId}/${thumbFile}`,
    last_polled_at: new Date().toISOString(),
  };
  if (status === "failed") {
    update.encode_error = `bunny_status_${meta.status}`;
  } else {
    update.encode_error = null;
  }
  const { data: row, error } = await admin
    .from("bunny_videos")
    .update(update)
    .eq("bunny_library_id", libraryId)
    .eq("bunny_video_id", videoId)
    .select()
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  return { ok: true, row };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method" });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json(401, { error: "missing_auth" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cdnHost = Deno.env.get("BUNNY_CDN_HOSTNAME");
    const libraryId = Deno.env.get("BUNNY_LIBRARY_ID");
    const libraryKey = Deno.env.get("BUNNY_LIBRARY_KEY");
    if (!cdnHost || !libraryId || !libraryKey) {
      return json(500, { error: "bunny_not_configured" });
    }

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u, error: uErr } = await userClient.auth.getUser();
    if (uErr || !u.user) return json(401, { error: "unauthenticated" });
    const userId = u.user.id;

    const body = (await req.json().catch(() => ({}))) as {
      bunny_video_id?: string;
      all_pending?: boolean;
    };

    const admin = createClient(supabaseUrl, serviceKey);

    if (body.bunny_video_id) {
      // Verify ownership before refreshing
      const { data: owned } = await admin
        .from("bunny_videos")
        .select("id, owner_id")
        .eq("bunny_library_id", libraryId)
        .eq("bunny_video_id", body.bunny_video_id)
        .maybeSingle();
      if (!owned || owned.owner_id !== userId) {
        return json(404, { error: "not_found" });
      }
      const res = await refreshOne(admin, cdnHost, libraryId, libraryKey, body.bunny_video_id);
      return json(res.ok ? 200 : 502, res);
    }

    // Bulk refresh: all uploading/encoding rows of this user not polled in 10s
    const cutoff = new Date(Date.now() - 10_000).toISOString();
    const { data: pending, error: pErr } = await admin
      .from("bunny_videos")
      .select("bunny_video_id")
      .eq("owner_id", userId)
      .in("status", ["uploading", "encoding"])
      .or(`last_polled_at.is.null,last_polled_at.lt.${cutoff}`)
      .limit(20);
    if (pErr) return json(500, { error: pErr.message });
    if (!pending || pending.length === 0) {
      return json(200, { ok: true, refreshed: 0 });
    }

    const results = await Promise.all(
      pending.map((p) =>
        refreshOne(admin, cdnHost, libraryId, libraryKey, p.bunny_video_id as string),
      ),
    );
    const refreshed = results.filter((r) => r.ok).length;
    return json(200, { ok: true, refreshed, total: pending.length });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : "unknown" });
  }
});
