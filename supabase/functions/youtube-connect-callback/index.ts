// youtube-connect-callback — (M25) exchanges the Google OAuth code for tokens,
// fetches the channel identity (channels.list mine=true), and upserts the
// youtube_connections row. Returns { ok, channel_title }.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return json({ error: "GOOGLE_CLIENT_ID/SECRET no configurados." }, 500);
    }
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const code = typeof body?.code === "string" ? body.code : null;
    const state = typeof body?.state === "string" ? body.state : null;
    if (!code || !state) return json({ error: "code and state are required" }, 400);

    // Validate + consume the CSRF state.
    const { data: stateRow, error: stErr } = await userClient
      .from("oauth_states")
      .select("state, owner_id, redirect_uri, expires_at")
      .eq("state", state)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (stErr || !stateRow) return json({ error: "Estado OAuth inválido o expirado." }, 400);
    if (new Date(stateRow.expires_at).getTime() < Date.now()) {
      return json({ error: "El estado OAuth expiró. Reintentá la conexión." }, 400);
    }
    await userClient.from("oauth_states").delete().eq("state", state);

    // Exchange code → tokens.
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: stateRow.redirect_uri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) {
      const t = await tokenRes.text();
      return json({ error: `Token exchange ${tokenRes.status}: ${t.slice(0, 400)}` }, 502);
    }
    const token = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };

    // Fetch channel identity.
    const chRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&mine=true",
      { headers: { Authorization: `Bearer ${token.access_token}` } },
    );
    if (!chRes.ok) {
      const t = await chRes.text();
      return json({ error: `channels.list ${chRes.status}: ${t.slice(0, 400)}` }, 502);
    }
    const chData = (await chRes.json()) as {
      items?: Array<{
        id: string;
        snippet?: { title?: string; thumbnails?: { default?: { url?: string }; medium?: { url?: string } } };
      }>;
    };
    const channel = chData.items?.[0];
    if (!channel) return json({ error: "No se encontró un canal de YouTube en esta cuenta." }, 404);

    const token_expires_at = token.expires_in
      ? new Date(Date.now() + token.expires_in * 1000).toISOString()
      : null;

    const { error: upErr } = await userClient
      .from("youtube_connections")
      .upsert(
        {
          owner_id: user.id,
          channel_id: channel.id,
          channel_title: channel.snippet?.title ?? null,
          channel_thumbnail_url:
            channel.snippet?.thumbnails?.medium?.url ?? channel.snippet?.thumbnails?.default?.url ?? null,
          access_token: token.access_token,
          // Google only returns a refresh_token on first consent; keep the existing one otherwise.
          ...(token.refresh_token ? { refresh_token: token.refresh_token } : {}),
          token_expires_at,
          scopes: token.scope ? token.scope.split(" ") : null,
          status: "connected",
          last_sync_error: null,
        },
        { onConflict: "owner_id" },
      );
    if (upErr) return json({ error: `Connection upsert failed: ${upErr.message}` }, 500);

    return json({ ok: true, channel_title: channel.snippet?.title ?? null });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
