// complete-motion-graphic-render
//
// Webhook called by render-worker after a motion graphic finishes rendering.
// Server-to-server only — HMAC verified against RENDER_WORKER_SECRET, no JWT.
// Set verify_jwt = false on deploy.
//
// Body:
//   { suggestion_id, status: "done", rendered_path: "owner/script/sugg.mp4" }
//   { suggestion_id, status: "error", error: "..." }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RENDER_WORKER_SECRET = Deno.env.get("RENDER_WORKER_SECRET");
const PUBLIC_BUCKET_BASE_URL =
  `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/motion-graphic-renders`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_SKEW_MS = 5 * 60 * 1000;

interface DoneBody {
  suggestion_id: string;
  status: "done";
  rendered_path: string;
}
interface ErrorBody {
  suggestion_id: string;
  status: "error";
  error: string;
}
type Body = DoneBody | ErrorBody;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
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
  if (!timingSafeEqual(a, b)) return { ok: false, reason: "signature_mismatch" };
  return { ok: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!RENDER_WORKER_SECRET) {
    return json({ error: "secret_not_configured" }, 500);
  }

  const rawBody = await req.text();
  const verdict = verifyHmac(req.headers.get("Authorization"), rawBody, RENDER_WORKER_SECRET);
  if (!verdict.ok) return json({ error: verdict.reason }, 401);

  let body: Body;
  try {
    body = JSON.parse(rawBody) as Body;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  if (!body.suggestion_id) return json({ error: "suggestion_id_required" }, 400);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  if (body.status === "done") {
    // Bucket is private — store the path. Client will mint a signed URL on read.
    // We persist the storage path in output_url for backwards compat with the
    // broll_renders pattern; the frontend treats it as "internal path" not
    // "public URL" and uses storage.createSignedUrl().
    const { error: updErr } = await admin
      .from("motion_graphic_suggestions")
      .update({
        generation_status: "done",
        generation_error: null,
        output_url: body.rendered_path,
        output_format: "mp4",
      })
      .eq("id", body.suggestion_id);
    if (updErr) return json({ error: "update_failed", detail: updErr.message }, 500);
    return json({ ok: true, public_url_base: PUBLIC_BUCKET_BASE_URL });
  }

  if (body.status === "error") {
    const { error: updErr } = await admin
      .from("motion_graphic_suggestions")
      .update({
        generation_status: "failed",
        generation_error: (body.error ?? "unknown_error").slice(0, 1000),
      })
      .eq("id", body.suggestion_id);
    if (updErr) return json({ error: "update_failed", detail: updErr.message }, 500);
    return json({ ok: true });
  }

  return json({ error: "unknown_status" }, 400);
});
