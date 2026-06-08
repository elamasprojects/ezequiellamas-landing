// youtube-sync — (M25) syncs the creator's own channel videos + public stats.
// Two modes:
//   OAuth (youtube_connections row with access_token) → channels?mine=true.
//   API key (YOUTUBE_API_KEY_V3) → resolve channel by handle/id (public data).
// The API-key mode needs no Google OAuth app; it creates a lightweight
// youtube_connections row (status 'apikey', no tokens) so the UI shows the
// channel + last sync, and re-syncs use the stored channel_id.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY_V3") ?? Deno.env.get("YOUTUBE_API_KEY");

const MAX_VIDEOS = 200;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function parseDuration(iso: string | undefined): number | null {
  if (!iso) return null;
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return null;
  return (parseInt(m[1] ?? "0") * 3600) + (parseInt(m[2] ?? "0") * 60) + parseInt(m[3] ?? "0");
}

interface Auth { accessToken?: string | null; apiKey?: string | null }

async function ytGet(url: string, auth: Auth): Promise<Record<string, unknown>> {
  let u = url;
  const headers: Record<string, string> = {};
  if (auth.apiKey) u += (u.includes("?") ? "&" : "?") + "key=" + encodeURIComponent(auth.apiKey);
  else if (auth.accessToken) headers.Authorization = `Bearer ${auth.accessToken}`;
  const res = await fetch(u, { headers });
  if (!res.ok) throw new Error(`YouTube API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return await res.json() as Record<string, unknown>;
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
  await client.from("youtube_connections").update({ access_token: t.access_token, token_expires_at }).eq("id", conn.id);
  return t.access_token;
}

interface ChannelInfo { channelId: string; uploads: string; title: string | null; thumbnail: string | null }

function pickChannel(data: Record<string, unknown>): ChannelInfo | null {
  const item = (data.items as Array<{
    id: string;
    snippet?: { title?: string; thumbnails?: Record<string, { url?: string }> };
    contentDetails?: { relatedPlaylists?: { uploads?: string } };
  }> | undefined)?.[0];
  const uploads = item?.contentDetails?.relatedPlaylists?.uploads;
  if (!item || !uploads) return null;
  return {
    channelId: item.id,
    uploads,
    title: item.snippet?.title ?? null,
    thumbnail: item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url ?? null,
  };
}

const CHANNEL_PARTS = "part=snippet,contentDetails";

async function resolveByApiKey(handle: string): Promise<ChannelInfo> {
  const h = handle.trim().replace(/^.*youtube\.com\//i, "").replace(/^\//, "");
  const at = h.startsWith("@") ? h : `@${h}`;
  // Channel id (UC...) → by id; otherwise by handle.
  if (/^UC[\w-]{20,}$/.test(h)) {
    const byId = pickChannel(await ytGet(`https://www.googleapis.com/youtube/v3/channels?${CHANNEL_PARTS}&id=${encodeURIComponent(h)}`, { apiKey: YOUTUBE_API_KEY }));
    if (byId) return byId;
  }
  const byHandle = pickChannel(await ytGet(`https://www.googleapis.com/youtube/v3/channels?${CHANNEL_PARTS}&forHandle=${encodeURIComponent(at)}`, { apiKey: YOUTUBE_API_KEY }));
  if (byHandle) return byHandle;
  // Fallback: search → channel id → channels.list.
  const search = await ytGet(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=1&q=${encodeURIComponent(h)}`, { apiKey: YOUTUBE_API_KEY });
  const cid = (search.items as Array<{ snippet?: { channelId?: string } }> | undefined)?.[0]?.snippet?.channelId
    ?? (search.items as Array<{ id?: { channelId?: string } }> | undefined)?.[0]?.id?.channelId;
  if (!cid) throw new Error(`No se encontró el canal "${handle}".`);
  const byId = pickChannel(await ytGet(`https://www.googleapis.com/youtube/v3/channels?${CHANNEL_PARTS}&id=${encodeURIComponent(cid)}`, { apiKey: YOUTUBE_API_KEY }));
  if (!byId) throw new Error(`No se pudo resolver el canal "${handle}".`);
  return byId;
}

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
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const bodyHandle = typeof body?.channel_handle === "string" ? body.channel_handle.trim() : "";

    const { data: conn } = await userClient
      .from("youtube_connections")
      .select("id, status, access_token, refresh_token, token_expires_at, channel_id")
      .eq("owner_id", user.id)
      .maybeSingle();

    // Decide auth strategy + uploads playlist.
    let auth: Auth;
    let uploads: string;
    let connId = conn?.id ?? null;

    if (conn && conn.status === "connected" && conn.access_token) {
      // OAuth mode.
      let accessToken: string;
      try {
        accessToken = await refreshIfNeeded(userClient, conn);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await userClient.from("youtube_connections").update({ last_sync_error: msg }).eq("id", conn.id);
        return json({ error: msg }, 502);
      }
      auth = { accessToken };
      const ch = pickChannel(await ytGet(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true`, auth));
      if (!ch) return json({ error: "No se encontró la playlist de uploads del canal." }, 404);
      uploads = ch.uploads;
    } else {
      // API-key mode.
      if (!YOUTUBE_API_KEY) return json({ error: "YOUTUBE_API_KEY_V3 no configurado." }, 500);
      auth = { apiKey: YOUTUBE_API_KEY };
      let channel: ChannelInfo;
      if (conn?.channel_id) {
        const byId = pickChannel(await ytGet(`https://www.googleapis.com/youtube/v3/channels?${CHANNEL_PARTS}&id=${encodeURIComponent(conn.channel_id)}`, auth));
        if (!byId) return json({ error: "No se pudo resolver el canal guardado." }, 404);
        channel = byId;
      } else {
        // Resolve by handle (body or profile).
        let handle = bodyHandle;
        if (!handle) {
          const { data: profile } = await userClient.from("profiles").select("youtube_handle").eq("id", user.id).maybeSingle();
          handle = (profile?.youtube_handle ?? "").trim();
        }
        if (!handle) return json({ error: "Indicá tu canal (@handle o URL)." }, 400);
        channel = await resolveByApiKey(handle);
        // Persist the handle for next time.
        await userClient.from("profiles").update({ youtube_handle: handle.replace(/^@/, "") }).eq("id", user.id);
      }
      uploads = channel.uploads;
      // Upsert a lightweight connection row (no tokens).
      const { data: upserted } = await userClient
        .from("youtube_connections")
        .upsert({
          owner_id: user.id,
          channel_id: channel.channelId,
          channel_title: channel.title,
          channel_thumbnail_url: channel.thumbnail,
          status: "apikey",
          last_sync_error: null,
        }, { onConflict: "owner_id" })
        .select("id")
        .single();
      connId = upserted?.id ?? conn?.id ?? null;
    }

    // Page uploads → video ids.
    const videoIds: string[] = [];
    let pageToken: string | undefined;
    do {
      const p = new URLSearchParams({ part: "contentDetails", playlistId: uploads, maxResults: "50" });
      if (pageToken) p.set("pageToken", pageToken);
      const data = await ytGet(`https://www.googleapis.com/youtube/v3/playlistItems?${p}`, auth);
      for (const it of (data.items as Array<{ contentDetails?: { videoId?: string } }> ?? [])) {
        const vid = it.contentDetails?.videoId;
        if (vid) videoIds.push(vid);
      }
      pageToken = data.nextPageToken as string | undefined;
    } while (pageToken && videoIds.length < MAX_VIDEOS);

    // Batch videos.list.
    let synced = 0;
    for (let i = 0; i < videoIds.length; i += 50) {
      const chunk = videoIds.slice(i, i + 50);
      const p = new URLSearchParams({ part: "snippet,statistics,contentDetails", id: chunk.join(","), maxResults: "50" });
      const data = await ytGet(`https://www.googleapis.com/youtube/v3/videos?${p}`, auth);
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
        thumbnail_url: v.snippet?.thumbnails?.medium?.url ?? v.snippet?.thumbnails?.high?.url ?? v.snippet?.thumbnails?.default?.url ?? null,
        raw: v as unknown as Record<string, unknown>,
        last_synced_at: new Date().toISOString(),
      }));
      if (rows.length > 0) {
        const { error: upErr } = await userClient.from("youtube_videos").upsert(rows, { onConflict: "owner_id,youtube_video_id", ignoreDuplicates: false });
        if (upErr) return json({ error: `Upsert failed: ${upErr.message}` }, 500);
        synced += rows.length;
      }
    }

    if (connId) {
      await userClient.from("youtube_connections").update({ last_synced_at: new Date().toISOString(), last_sync_error: null }).eq("id", connId);
    }

    return json({ ok: true, synced, discovered: videoIds.length });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
