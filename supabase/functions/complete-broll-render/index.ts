// supabase/functions/complete-broll-render/index.ts
//
// Webhook called by the render worker after a B-roll job finishes (or errors).
// Server-to-server only -- HMAC verified against RENDER_WORKER_SECRET, no JWT.
//
// Set verify_jwt = false on deploy.
//
// Body shapes:
//   { broll_suggestion_id, status: "done", rendered_path, signed_url }
//   { broll_suggestion_id, status: "error", error }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RENDER_WORKER_SECRET = Deno.env.get("RENDER_WORKER_SECRET");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_SKEW_MS = 5 * 60 * 1000;

interface DoneBody {
  broll_suggestion_id: string;
  status: "done";
  rendered_path: string;
  signed_url: string;
}

interface ErrorBody {
  broll_suggestion_id: string;
  status: "error";
  error: string;
}

type Body = DoneBody | ErrorBody;

Deno.serve(async (req: Request) => {
  try {
    return await handle(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[complete-broll-render] uncaught:", message, stack);
    return json({ error: "internal_error", detail: message }, 500);
  }
});

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!RENDER_WORKER_SECRET) {
    return json({ error: "secret_not_configured" }, 500);
  }

  const rawBody = await req.text();
  const auth = req.headers.get("Authorization");
  const verdict = verifyHmac(auth, rawBody, RENDER_WORKER_SECRET);
  if (!verdict.ok) {
    return json({ error: verdict.reason }, 401);
  }

  let body: Body;
  try {
    body = JSON.parse(rawBody) as Body;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  if (!body.broll_suggestion_id || !body.status) {
    return json({ error: "missing_fields" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  if (body.status === "done") {
    const { error } = await admin
      .from("broll_suggestions")
      .update({
        generation_status: "done",
        generation_error: null,
        output_url: body.signed_url,
        output_type: "video",
      })
      .eq("id", body.broll_suggestion_id);
    if (error) {
      return json({ error: "update_failed", detail: error.message }, 500);
    }
    return json({ ok: true });
  }

  if (body.status === "error") {
    await admin
      .from("broll_suggestions")
      .update({
        generation_status: "failed",
        generation_error: (body.error ?? "unknown_error").slice(0, 1000),
      })
      .eq("id", body.broll_suggestion_id);
    return json({ ok: true });
  }

  return json({ error: "unknown_status" }, 400);
}

function verifyHmac(
  authorization: string | null,
  rawBody: string,
  secret: string,
): { ok: true } | { ok: false; reason: string } {
  if (!authorization) return { ok: false, reason: "missing_auth_header" };
  if (!authorization.startsWith("HMAC ")) {
    return { ok: false, reason: "wrong_scheme" };
  }
  const payload = authorization.slice(5);
  const dotIndex = payload.indexOf(".");
  if (dotIndex === -1) return { ok: false, reason: "malformed_payload" };
  const ts = payload.slice(0, dotIndex);
  const sig = payload.slice(dotIndex + 1);
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) {
    return { ok: false, reason: "invalid_timestamp" };
  }
  if (Math.abs(Date.now() - tsNum) > MAX_SKEW_MS) {
    return { ok: false, reason: "timestamp_skew" };
  }
  const expected = createHmac("sha256", secret)
    .update(`${ts}.${rawBody}`)
    .digest("hex");
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return { ok: false, reason: "signature_mismatch" };
  if (!timingSafeEqual(a, b)) {
    return { ok: false, reason: "signature_mismatch" };
  }
  return { ok: true };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
