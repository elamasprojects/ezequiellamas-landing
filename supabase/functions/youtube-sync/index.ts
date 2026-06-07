// youtube-sync — (M25) pulls the connected channel's uploads + public stats via
// the YouTube Data API and upserts youtube_videos. Refreshes the access token if
// expired. Returns { ok, synced }.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

const MAX_VIDEOS = 200;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ISO-8601 duration (PT#H#M#S) → seconds.
function parseDuration(iso: string | undefined): number | null {
  if (!iso) return null;
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return null;
  return (parseInt(m[1] ?? "0") * 3600) + (parseInt(m[2] ?? "0") * 60) + parseInt(m[3] ?? "0");
}

async function refreshIfNeeded(
  client: SupabaseClient,
  conn: { id: string; access_token: string; refresh_token: string | null; token_expires_at: string | null },
): Promise<string> {
  const stillValid = conn.token_expires_at && new Date(conn.token_expires_at).getTime() > Date.now() + 60_000;
  if (stillValid) return conn.access_token;
  if (!conn.refresh_token) throw new Error("Sin refresh_token. Reconectá el canal de YouTube.");
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) throw new Error("GOOGLE_CLIENT_ID/SECRET no configurados.");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: conn.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Token refresh ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const t = (await res.json()) as { access_token: string; expires_in?: number };
  const token_expires_at = t.expires_in ? new Date(Date.now() + t.expires_in * 1000).toISOString() : null;
  await client
    .from("youtube_connections")
    .update({ access_token: t.access_token, token_expires_at })
    .eq("id", conn.id);
  return t.access_token;
}

async function ytGet(url: string, accessToken: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`YouTube API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return await res.json() as Record<string, unknown>;
}

interface PlaylistItem { contentDetails?: { videoId?: string } }
interface VideoItem {
  id: string;
  snippet?: { title?: string; description?: string; publishedAt?: string; thumbnails?: Record<string, { url?: string }> };
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
  contentDetails?: { duration?: string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization" }, 401);
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthenticated" }, 401);

    const { data: conn, error: connErr } = await userClient
      .from("youtube_connections")
      .select("id, access_token, refresh_token, token_expires_at, channel_id")
      .eq("owner_id", user.id)
      .maybeSingle();
    if (connErr || !conn) return json({ error: "No hay un canal de YouTube conectado." }, 404);

    let accessToken: string;
    try {
      accessToken = await refreshIfNeeded(userClient, conn);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await userClient.from("youtube_connections").update({ last_sync_error: msg }).eq("id", conn.id);
      return json({ error: msg }, 502);
    }

    // Uploads playlist id.
    const ch = await ytGet(
      "https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true",
      accessToken,
    );
    const uploads = (ch.items as Array<{ contentDetails?: { relatedPlaylists?: { uploads?: string } } }> | undefined)
      ?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploads) return json({ error: "No se encontró la playlist de uploads del canal." }, 404);

    // Page playlistItems → collect video ids.
    const videoIds: string[] = [];
    let pageToken: string | undefined;
    do {
      const p = new URLSearchParams({
        part: "contentDetails",
        playlistId: uploads,
        maxResults: "50",
      });
      if (pageToken) p.set("pageToken", pageToken);
      const data = await ytGet(`https://www.googleapis.com/youtube/v3/playlistItems?${p}`, accessToken);
      for (const it of (data.items as PlaylistItem[] ?? [])) {
        const vid = it.contentDetails?.videoId;
        if (vid) videoIds.push(vid);
      }
      pageToken = data.nextPageToken as string | undefined;
    } while (pageToken && videoIds.length < MAX_VIDEOS);

    // Batch videos.list (≤50 ids) → snippet + statistics + contentDetails.
    let synced = 0;
    for (let i = 0; i < videoIds.length; i += 50) {
      const chunk = videoIds.slice(i, i + 50);
      const p = new URLSearchParams({
        part: "snippet,statistics,contentDetails",
        id: chunk.join(","),
        maxResults: "50",
      });
      const data = await ytGet(`https://www.googleapis.com/youtube/v3/videos?${p}`, accessToken);
      const rows = (data.items as VideoItem[] ?? []).map((v) => ({
        owner_id: user.id,
        youtube_video_id: v.id,
        title: v.snippet?.title ?? null,
        description: v.snippet?.description ?? null,
        published_at: v.snippet?.publishedAt ?? null,
        view_count: v.statistics?.viewCount ? Number(v.statistics.viewCount) : null,
        like_count: v.statistics?.likeCount ? Number(v.statistics.likeCount) : null,
        comment_count: v.statistics?.commentCount ? Number(v.statistics.commentCount) : null,
        duration_seconds: parseDuration(v.contentDetails?.duration),
        thumbnail_url:
          v.snippet?.thumbnails?.medium?.url ?? v.snippet?.thumbnails?.high?.url ?? v.snippet?.thumbnails?.default?.url ?? null,
        raw: v as unknown as Record<string, unknown>,
        last_synced_at: new Date().toISOString(),
      }));
      if (rows.length > 0) {
        const { error: upErr } = await userClient
          .from("youtube_videos")
          .upsert(rows, { onConflict: "owner_id,youtube_video_id", ignoreDuplicates: false });
        if (upErr) return json({ error: `Upsert failed: ${upErr.message}` }, 500);
        synced += rows.length;
      }
    }

    await userClient
      .from("youtube_connections")
      .update({ last_synced_at: new Date().toISOString(), last_sync_error: null })
      .eq("id", conn.id);

    return json({ ok: true, synced, discovered: videoIds.length });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
