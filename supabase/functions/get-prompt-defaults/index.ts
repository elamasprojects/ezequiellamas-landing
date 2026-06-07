// get-prompt-defaults — returns the hardcoded default text for every editable
// prompt slug, so the "Prompts IA" settings tab can show the real default and
// offer an accurate "reset to default". Single source of truth: the same
// SCRIPT_PROMPT_DEFAULTS registry generate-script uses at generation time.
//
// JWT-guarded (only logged-in users fetch it). No service role needed.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { SCRIPT_PROMPT_DEFAULTS } from "../generate-script/prompt.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Adapt-mode and YouTube defaults are reserved for upcoming milestones (M23/M26).
// They live here so the UI can render the slots; generation functions will read
// from the same place once built. Empty string = "no default yet, write your own".
const RESERVED_DEFAULTS: Record<string, string> = {
  "adapt.copy": "",
  "adapt.voice": "",
  "adapt.instructions": "",
  "youtube.structure": "",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthenticated" }, 401);

    const defaults: Record<string, string> = {
      ...SCRIPT_PROMPT_DEFAULTS,
      ...RESERVED_DEFAULTS,
    };
    return json({ defaults });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
