// supabase/functions/start-carousel-render/index.ts
//
// Validates the carousel is ready, creates a render_jobs row, marks slides
// as queued, and POSTs an HMAC-signed payload to the render worker on Railway.
// Returns { job_id } immediately -- worker processes async and calls back to
// complete-carousel-render.
//
// Body: { carousel_id: string }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RENDER_WORKER_URL = Deno.env.get("RENDER_WORKER_URL");
const RENDER_WORKER_SECRET = Deno.env.get("RENDER_WORKER_SECRET");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestBody {
  carousel_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!RENDER_WORKER_URL || !RENDER_WORKER_SECRET) {
    return json({ error: "render_worker_not_configured" }, 500);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const { carousel_id } = body;
  if (!carousel_id) return json({ error: "carousel_id_required" }, 400);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401);

  const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // 1) Load carousel + slides via JWT-bound client (RLS scopes to owner)
  const { data: carousel, error: cErr } = await userClient
    .from("carousels")
    .select("id, owner_id, mode, status, design_format")
    .eq("id", carousel_id)
    .maybeSingle();
  if (cErr) return json({ error: "load_failed", detail: cErr.message }, 500);
  if (!carousel) return json({ error: "carousel_not_found" }, 404);
  if (carousel.status === "rendering") {
    return json({ error: "already_rendering" }, 409);
  }
  if (!carousel.design_format) {
    return json({ error: "missing_design_format" }, 400);
  }

  const { data: slides, error: sErr } = await userClient
    .from("carousel_slides")
    .select("id, index, template, content")
    .eq("carousel_id", carousel_id)
    .order("index", { ascending: true });
  if (sErr || !slides || slides.length === 0) {
    return json({ error: "no_slides_to_render" }, 400);
  }

  const mode = carousel.mode as "static" | "animated";

  // 2) Create job row
  const { data: jobRow, error: jobErr } = await admin
    .from("carousel_render_jobs")
    .insert({
      carousel_id,
      owner_id: carousel.owner_id,
      mode,
      total_slides: slides.length,
      status: "queued",
    })
    .select("id")
    .single();
  if (jobErr || !jobRow) {
    return json({ error: "job_insert_failed", detail: jobErr?.message }, 500);
  }
  const job_id = jobRow.id;

  // 3) Mark slides as queued + carousel as rendering
  await admin
    .from("carousel_slides")
    .update({ render_status: "queued", render_error: null })
    .eq("carousel_id", carousel_id);
  await admin
    .from("carousels")
    .update({ status: "rendering" })
    .eq("id", carousel_id);

  // 4) Build worker payload
  // In animated mode, slides at indices 0, 2, 4 (slide_01, slide_03, slide_05)
  // export as MP4. Everything else is PNG.
  const workerSlides = slides.map((s) => ({
    index: s.index,
    template: s.template,
    content: s.content,
    output_format:
      mode === "animated" && s.index % 2 === 0 && s.index <= 4
        ? "mp4"
        : "png",
  }));
  const workerBody = {
    kind: "carousel" as const,
    job_id,
    carousel_id,
    owner_id: carousel.owner_id,
    mode,
    design_format: carousel.design_format,
    slides: workerSlides,
  };
  const rawBody = JSON.stringify(workerBody);
  const timestamp = Date.now().toString();
  const sig = createHmac("sha256", RENDER_WORKER_SECRET)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  // 5) Fire-and-forget POST -- worker should respond 202 quickly
  try {
    const res = await fetch(`${RENDER_WORKER_URL}/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `HMAC ${timestamp}.${sig}`,
      },
      body: rawBody,
    });
    if (!res.ok) {
      const detail = await res.text();
      // Mark job error so client surfaces it
      await admin
        .from("carousel_render_jobs")
        .update({
          status: "error",
          error: `worker_${res.status}: ${detail.slice(0, 300)}`,
          finished_at: new Date().toISOString(),
        })
        .eq("id", job_id);
      await admin
        .from("carousels")
        .update({ status: "error" })
        .eq("id", carousel_id);
      return json(
        { error: "worker_dispatch_failed", detail: detail.slice(0, 300) },
        502,
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await admin
      .from("carousel_render_jobs")
      .update({
        status: "error",
        error: `dispatch_${message}`,
        finished_at: new Date().toISOString(),
      })
      .eq("id", job_id);
    await admin
      .from("carousels")
      .update({ status: "error" })
      .eq("id", carousel_id);
    return json({ error: "worker_unreachable", detail: message }, 502);
  }

  // 6) Mark job as running so the UI can show progress
  await admin
    .from("carousel_render_jobs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", job_id);

  return json({ job_id, total_slides: slides.length });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
