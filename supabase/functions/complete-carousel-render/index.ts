// supabase/functions/complete-carousel-render/index.ts
//
// Webhook called by the render worker after each slide finishes (or errors)
// and once at the end of the job. Server-to-server only -- HMAC verified
// against RENDER_WORKER_SECRET, no JWT needed.
//
// Set verify_jwt = false on deploy.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac, timingSafeEqual } from "node:crypto";

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

interface SlideDoneBody {
  job_id: string;
  slide_index: number;
  status: "done";
  rendered_path: string;
  rendered_format: "png" | "mp4";
}
interface SlideErrorBody {
  job_id: string;
  slide_index: number;
  status: "error";
  error: string;
}
interface JobDoneBody {
  job_id: string;
  status: "job_done";
}
interface JobErrorBody {
  job_id: string;
  status: "job_error";
  error: string;
}
type Body = SlideDoneBody | SlideErrorBody | JobDoneBody | JobErrorBody;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!RENDER_WORKER_SECRET) {
    return json({ error: "secret_not_configured" }, 500);
  }

  // Read raw body for HMAC verification
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

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Load job to know owner_id + carousel_id (and to verify it exists)
  const { data: job, error: jobErr } = await admin
    .from("carousel_render_jobs")
    .select("id, carousel_id, total_slides, completed_slides")
    .eq("id", body.job_id)
    .maybeSingle();
  if (jobErr || !job) {
    return json({ error: "job_not_found" }, 404);
  }

  if (body.status === "done") {
    // Update the slide row
    const { error: slErr } = await admin
      .from("carousel_slides")
      .update({
        rendered_path: body.rendered_path,
        rendered_format: body.rendered_format,
        render_status: "done",
        render_error: null,
        rendered_at: new Date().toISOString(),
      })
      .eq("carousel_id", job.carousel_id)
      .eq("index", body.slide_index);
    if (slErr) {
      return json({ error: "slide_update_failed", detail: slErr.message }, 500);
    }
    // Increment job counter
    const { error: jUpErr } = await admin
      .from("carousel_render_jobs")
      .update({ completed_slides: (job.completed_slides ?? 0) + 1 })
      .eq("id", job.id);
    if (jUpErr) {
      return json({ error: "job_update_failed", detail: jUpErr.message }, 500);
    }
    // If this is slide 1 (index 0), update the carousel thumbnail_path
    if (body.slide_index === 0 && body.rendered_format === "png") {
      await admin
        .from("carousels")
        .update({ thumbnail_path: body.rendered_path })
        .eq("id", job.carousel_id);
    }
    return json({ ok: true });
  }

  if (body.status === "error") {
    await admin
      .from("carousel_slides")
      .update({
        render_status: "error",
        render_error: body.error.slice(0, 1000),
      })
      .eq("carousel_id", job.carousel_id)
      .eq("index", body.slide_index);
    // Don't increment completed_slides on error (still counted as attempted via job_done)
    return json({ ok: true });
  }

  if (body.status === "job_done") {
    await admin
      .from("carousel_render_jobs")
      .update({ status: "done", finished_at: new Date().toISOString() })
      .eq("id", job.id);
    await admin
      .from("carousels")
      .update({ status: "rendered" })
      .eq("id", job.carousel_id);
    return json({ ok: true });
  }

  if (body.status === "job_error") {
    await admin
      .from("carousel_render_jobs")
      .update({
        status: "error",
        error: body.error.slice(0, 1000),
        finished_at: new Date().toISOString(),
      })
      .eq("id", job.id);
    await admin
      .from("carousels")
      .update({ status: "error" })
      .eq("id", job.carousel_id);
    return json({ ok: true });
  }

  return json({ error: "unknown_status" }, 400);
});

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
