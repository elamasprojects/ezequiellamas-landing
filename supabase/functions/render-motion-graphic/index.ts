// render-motion-graphic
//
// Dispatcher: marks a motion_graphic_suggestion as queued, then sends an
// HMAC-signed payload to the render-worker on Railway. Returns 202 immediately.
// Worker calls back to complete-motion-graphic-render when the MP4 lands in
// storage.
//
// Body: { suggestion_id: string }
// Auth: user JWT (RLS validates ownership of the parent script)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RENDER_WORKER_URL = Deno.env.get("RENDER_WORKER_URL");
const RENDER_WORKER_SECRET = Deno.env.get("RENDER_WORKER_SECRET");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!RENDER_WORKER_URL || !RENDER_WORKER_SECRET) {
    return json({ error: "render_worker_not_configured" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401);

  let body: { suggestion_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const suggestion_id = body?.suggestion_id;
  if (!suggestion_id || typeof suggestion_id !== "string") {
    return json({ error: "suggestion_id_required" }, 400);
  }

  // RLS-bound client to validate the caller owns this suggestion's parent script.
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  // Service-role client for the queued-state update and the parent script lookup
  // (suggestion row is loaded with userClient first to validate ownership).
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // 1) Load suggestion + template via user JWT (RLS validates owner-of-script).
  const { data: suggestion, error: sErr } = await userClient
    .from("motion_graphic_suggestions")
    .select(
      "id, script_id, template_id, filled_slots, generation_status, motion_graphic_templates(slug, duration_s)",
    )
    .eq("id", suggestion_id)
    .maybeSingle();
  if (sErr) return json({ error: "load_failed", detail: sErr.message }, 500);
  if (!suggestion) return json({ error: "suggestion_not_found_or_unauthorized" }, 404);
  if (suggestion.generation_status === "queued" || suggestion.generation_status === "processing") {
    return json({ error: "already_in_progress", status: suggestion.generation_status }, 409);
  }

  // Postgrest returns the joined row as object (many-to-one).
  const tpl = suggestion.motion_graphic_templates as
    | { slug: string; duration_s: number }
    | { slug: string; duration_s: number }[]
    | null;
  const template = Array.isArray(tpl) ? tpl[0] : tpl;
  if (!template) return json({ error: "template_join_missing" }, 500);

  // 2) Resolve owner_id from the parent script (via service role — the
  //    suggestion row doesn't carry owner_id directly).
  const { data: script, error: scErr } = await admin
    .from("scripts")
    .select("id, owner_id")
    .eq("id", suggestion.script_id)
    .maybeSingle();
  if (scErr || !script) {
    return json({ error: "script_lookup_failed", detail: scErr?.message }, 500);
  }

  // 3) Mark as queued (service role bypasses RLS for the status field flip).
  const { error: qErr } = await admin
    .from("motion_graphic_suggestions")
    .update({
      generation_status: "queued",
      generation_error: null,
      requested: true,
    })
    .eq("id", suggestion_id);
  if (qErr) return json({ error: "queue_failed", detail: qErr.message }, 500);

  // 4) Build worker payload + HMAC and dispatch.
  const workerBody = {
    kind: "motion_graphic" as const,
    suggestion_id,
    owner_id: script.owner_id,
    script_id: suggestion.script_id,
    template_slug: template.slug,
    duration_s: Number(template.duration_s),
    filled_slots: suggestion.filled_slots ?? {},
  };
  const rawBody = JSON.stringify(workerBody);
  const timestamp = Date.now().toString();
  const sig = createHmac("sha256", RENDER_WORKER_SECRET)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  try {
    const res = await fetch(`${RENDER_WORKER_URL}/render-motion-graphic`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `HMAC ${timestamp}.${sig}`,
      },
      body: rawBody,
    });
    if (!res.ok) {
      const detail = await res.text();
      await admin
        .from("motion_graphic_suggestions")
        .update({
          generation_status: "failed",
          generation_error: `worker_${res.status}: ${detail.slice(0, 300)}`,
        })
        .eq("id", suggestion_id);
      return json(
        { error: "worker_dispatch_failed", detail: detail.slice(0, 300) },
        502,
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await admin
      .from("motion_graphic_suggestions")
      .update({
        generation_status: "failed",
        generation_error: `dispatch_${message}`.slice(0, 1000),
      })
      .eq("id", suggestion_id);
    return json({ error: "worker_unreachable", detail: message }, 502);
  }

  // 5) Mark as processing so the UI can show progress (worker actually does
  //    the encoding now).
  await admin
    .from("motion_graphic_suggestions")
    .update({ generation_status: "processing" })
    .eq("id", suggestion_id);

  return json({ ok: true, suggestion_id, status: "processing" });
});
