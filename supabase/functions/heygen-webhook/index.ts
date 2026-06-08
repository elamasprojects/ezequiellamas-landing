// heygen-webhook — (M26) public endpoint HeyGen calls when an avatar video
// finishes. Updates the matching youtube_project_sections row with the clone
// video URL (or error). Deploy with verify_jwt=false. If HEYGEN_WEBHOOK_SECRET
// is set, validates the HMAC-SHA256 signature; otherwise accepts (MVP).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const HEYGEN_WEBHOOK_SECRET = Deno.env.get("HEYGEN_WEBHOOK_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function verifySignature(rawBody: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const expected = Array.from(new Uint8Array(sigBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  const provided = header.trim().toLowerCase().replace(/^sha256=/, "");
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i++) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const rawBody = await req.text();
    if (HEYGEN_WEBHOOK_SECRET) {
      const sig = req.headers.get("signature") ?? req.headers.get("x-heygen-signature");
      const ok = await verifySignature(rawBody, sig, HEYGEN_WEBHOOK_SECRET);
      if (!ok) return json({ error: "Invalid signature" }, 401);
    }

    const payload = JSON.parse(rawBody) as {
      event_type?: string;
      event_data?: { video_id?: string; url?: string; callback_id?: string; msg?: string };
    };
    const eventType = payload.event_type ?? "";
    const videoId = payload.event_data?.video_id ?? null;
    const callbackId = payload.event_data?.callback_id ?? null; // = section_id
    const url = payload.event_data?.url ?? null;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Locate the section by callback_id (section id) or heygen_video_id.
    let query = admin.from("youtube_project_sections").select("id");
    if (callbackId) query = query.eq("id", callbackId);
    else if (videoId) query = query.eq("heygen_video_id", videoId);
    else return json({ ok: true, ignored: "no identifiers" });
    const { data: section } = await query.maybeSingle();
    if (!section) return json({ ok: true, ignored: "section not found" });

    const success = eventType.includes("success");
    if (success && url) {
      await admin.from("youtube_project_sections").update({
        clone_status: "done",
        clone_video_url: url,
        clone_error: null,
        ...(videoId ? { heygen_video_id: videoId } : {}),
      }).eq("id", section.id);
    } else if (eventType.includes("fail")) {
      await admin.from("youtube_project_sections").update({
        clone_status: "failed",
        clone_error: payload.event_data?.msg ?? "HeyGen render failed",
      }).eq("id", section.id);
    }

    return json({ ok: true });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
