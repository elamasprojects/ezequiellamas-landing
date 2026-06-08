// list-heygen-avatars — (M27) returns the account's HeyGen avatar looks
// (id + name + preview image) so the Studio can offer a per-section look picker.
// Uses the server-side HEYGEN_API_KEY (the client never sees it).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const HEYGEN_API_KEY = Deno.env.get("HEYGEN_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

interface HeyGenAvatar {
  avatar_id?: string;
  avatar_name?: string;
  gender?: string;
  preview_image_url?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    if (!HEYGEN_API_KEY) return json({ error: "HEYGEN_API_KEY no configurado." }, 500);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization" }, 401);
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthenticated" }, 401);

    const res = await fetch("https://api.heygen.com/v2/avatars", {
      headers: { "X-Api-Key": HEYGEN_API_KEY, accept: "application/json" },
    });
    if (!res.ok) {
      const t = await res.text();
      return json({ error: `HeyGen ${res.status}: ${t.slice(0, 400)}` }, 502);
    }
    const body = (await res.json()) as { data?: { avatars?: HeyGenAvatar[] } };
    const avatars = (body.data?.avatars ?? [])
      .filter((a) => a.avatar_id)
      .map((a) => ({
        avatar_id: a.avatar_id as string,
        name: a.avatar_name ?? a.avatar_id,
        gender: a.gender ?? null,
        preview_image_url: a.preview_image_url ?? null,
      }));

    return json({ ok: true, avatars });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
