// youtube-connect-start — (M25) builds the Google OAuth consent URL to connect
// the creator's own YouTube channel (scope youtube.readonly) and stores a CSRF
// state in oauth_states. Returns { url, state }.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const APP_URL = Deno.env.get("APP_URL") ?? "https://ezequiellamas.com";

const SCOPE = "https://www.googleapis.com/auth/youtube.readonly";

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
    if (!GOOGLE_CLIENT_ID) {
      return json({ error: "GOOGLE_CLIENT_ID no configurado. Configurá las credenciales de Google Cloud." }, 500);
    }
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthenticated" }, 401);

    const redirect_uri = `${APP_URL.replace(/\/+$/, "")}/app/admin/youtube`;
    const state = crypto.randomUUID();
    const expires_at = new Date(Date.now() + 10 * 60_000).toISOString();

    const { error: insErr } = await userClient.from("oauth_states").insert({
      state,
      owner_id: user.id,
      platform: "youtube",
      redirect_uri,
      expires_at,
    });
    if (insErr) return json({ error: `oauth_state insert failed: ${insErr.message}` }, 500);

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri,
      response_type: "code",
      scope: SCOPE,
      access_type: "offline",
      include_granted_scopes: "true",
      prompt: "consent",
      state,
    });
    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return json({ url, state });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
