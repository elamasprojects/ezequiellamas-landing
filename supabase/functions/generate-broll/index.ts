// supabase/functions/generate-broll/index.ts
//
// Dispatches B-roll generation for a single broll_suggestion row.
//
// Variant 1 (v1): NanoBanana 2 → image → Kling → animated video
// Variant 2 (v2): Remotion + Hypermotion via Railway render worker (same infra as carousels)
//
// Body: { broll_suggestion_id: string }
//
// Returns: { ok: boolean, job_id?: string }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Variant 1 — NanoBanana 2 + Kling
const NANO_BANANA_API_KEY = Deno.env.get("NANO_BANANA_API_KEY");
const KLING_API_KEY = Deno.env.get("KLING_API_KEY");

// Variant 2 — Railway render worker (shared with carousels)
const RENDER_WORKER_URL = Deno.env.get("RENDER_WORKER_URL");
const RENDER_WORKER_SECRET = Deno.env.get("RENDER_WORKER_SECRET");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401);

  let body: { broll_suggestion_id: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const { broll_suggestion_id } = body;
  if (!broll_suggestion_id) return json({ error: "broll_suggestion_id_required" }, 400);

  const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Load broll with style info (RLS scopes to owner)
  const { data: broll, error: brollErr } = await userClient
    .from("broll_suggestions")
    .select("*, broll_styles(*)")
    .eq("id", broll_suggestion_id)
    .maybeSingle();

  if (brollErr) return json({ error: "load_failed", detail: brollErr.message }, 500);
  if (!broll) return json({ error: "broll_not_found" }, 404);
  if (!broll.requested) return json({ error: "broll_not_requested" }, 400);
  if (broll.generation_status === "processing" || broll.generation_status === "queued") {
    return json({ error: "already_generating" }, 409);
  }

  // Mark as queued
  await admin
    .from("broll_suggestions")
    .update({ generation_status: "queued" })
    .eq("id", broll_suggestion_id);

  const variant = broll.variant as "v1" | "v2" | null;

  if (!variant) {
    await admin
      .from("broll_suggestions")
      .update({ generation_status: "failed" })
      .eq("id", broll_suggestion_id);
    return json({ error: "no_variant_selected" }, 400);
  }

  try {
    if (variant === "v1") {
      return await generateV1(broll, admin);
    } else {
      return await generateV2(broll, admin);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await admin
      .from("broll_suggestions")
      .update({ generation_status: "failed" })
      .eq("id", broll_suggestion_id);
    return json({ error: "generation_failed", detail: msg }, 500);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// Variant 1: NanoBanana 2 → Kling
// ──────────────────────────────────────────────────────────────────────────────

async function generateV1(
  // deno-lint-ignore no-explicit-any
  broll: any,
  // deno-lint-ignore no-explicit-any
  admin: any,
): Promise<Response> {
  if (!NANO_BANANA_API_KEY || !KLING_API_KEY) {
    await admin
      .from("broll_suggestions")
      .update({ generation_status: "failed" })
      .eq("id", broll.id);
    return json(
      {
        error: "v1_not_configured",
        detail:
          "NANO_BANANA_API_KEY and KLING_API_KEY must be set in Edge Function secrets.",
      },
      503,
    );
  }

  const style = broll.broll_styles;
  const imagePrompt = [
    style?.image_prompt,
    broll.image_description,
  ]
    .filter(Boolean)
    .join("\n\n");

  const animationPrompt = [
    style?.animation_prompt,
    broll.animation_description,
  ]
    .filter(Boolean)
    .join("\n\n");

  await admin
    .from("broll_suggestions")
    .update({ generation_status: "processing" })
    .eq("id", broll.id);

  // ── Step 1: Generate image with NanoBanana 2 ──────────────────────────────
  // TODO: Replace with actual NanoBanana 2 API call once credentials + docs available.
  // Expected: POST https://api.nanobanana.ai/v2/generate
  //   { prompt: imagePrompt, width: 1920, height: 1080, ... }
  //   → { image_url: string }
  console.log("[generate-broll] NanoBanana 2 imagePrompt:", imagePrompt.slice(0, 200));

  const nbRes = await fetch("https://api.nanobanana.ai/v2/generate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NANO_BANANA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: imagePrompt,
      width: 1920,
      height: 1080,
    }),
  });

  if (!nbRes.ok) {
    const txt = await nbRes.text();
    throw new Error(`NanoBanana 2 error ${nbRes.status}: ${txt.slice(0, 300)}`);
  }

  const nbData = await nbRes.json();
  const imageUrl: string = nbData.image_url;
  if (!imageUrl) throw new Error("NanoBanana 2 returned no image_url");

  // ── Step 2: Animate with Kling ────────────────────────────────────────────
  // TODO: Replace with actual Kling API call once credentials + docs available.
  // Expected: POST https://api.klingai.com/v1/videos/image2video
  //   { image_url: imageUrl, prompt: animationPrompt, model_name: "kling-v2-master", ... }
  //   → { task_id: string } then poll GET /v1/videos/image2video/{task_id}
  console.log("[generate-broll] Kling animationPrompt:", animationPrompt.slice(0, 200));

  const klingRes = await fetch(
    "https://api.klingai.com/v1/videos/image2video",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KLING_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: imageUrl,
        prompt: animationPrompt,
        model_name: "kling-v2-master",
        duration: "5",
        mode: "pro",
      }),
    },
  );

  if (!klingRes.ok) {
    const txt = await klingRes.text();
    throw new Error(`Kling error ${klingRes.status}: ${txt.slice(0, 300)}`);
  }

  const klingData = await klingRes.json();
  const taskId: string = klingData.data?.task_id;
  if (!taskId) throw new Error("Kling returned no task_id");

  // Poll Kling until done (max 90s)
  let videoUrl: string | null = null;
  for (let i = 0; i < 18; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const pollRes = await fetch(
      `https://api.klingai.com/v1/videos/image2video/${taskId}`,
      { headers: { Authorization: `Bearer ${KLING_API_KEY}` } },
    );
    if (!pollRes.ok) continue;
    const pollData = await pollRes.json();
    const status = pollData.data?.task_status;
    if (status === "succeed") {
      videoUrl = pollData.data?.task_result?.videos?.[0]?.url ?? null;
      break;
    }
    if (status === "failed") throw new Error("Kling task failed");
  }

  if (!videoUrl) throw new Error("Kling timed out — task not completed in 90s");

  // Persist result
  await admin
    .from("broll_suggestions")
    .update({
      generation_status: "done",
      output_url: videoUrl,
      output_type: "video",
    })
    .eq("id", broll.id);

  return json({ ok: true, output_url: videoUrl });
}

// ──────────────────────────────────────────────────────────────────────────────
// Variant 2: Remotion + Hypermotion via Railway worker
// ──────────────────────────────────────────────────────────────────────────────

async function generateV2(
  // deno-lint-ignore no-explicit-any
  broll: any,
  // deno-lint-ignore no-explicit-any
  admin: any,
): Promise<Response> {
  if (!RENDER_WORKER_URL || !RENDER_WORKER_SECRET) {
    await admin
      .from("broll_suggestions")
      .update({ generation_status: "failed" })
      .eq("id", broll.id);
    return json(
      {
        error: "v2_not_configured",
        detail: "RENDER_WORKER_URL and RENDER_WORKER_SECRET must be set.",
      },
      503,
    );
  }

  const style = broll.broll_styles;

  const payload = {
    type: "broll",
    broll_suggestion_id: broll.id,
    composition: "BrollComposition",
    props: {
      imageDescription: broll.image_description ?? broll.suggestion,
      animationDescription: broll.animation_description ?? "",
      selectedWords: broll.selected_words ?? [],
      templateCode: style?.template_code ?? null,
      styleName: style?.name ?? null,
    },
    output_format: "mp4",
    // Callback so the worker can write output_url back
    callback_url: `${SUPABASE_URL}/functions/v1/complete-broll-render`,
  };

  const timestamp = Date.now().toString();
  const rawBody = JSON.stringify(payload);
  const sig = createHmac("sha256", RENDER_WORKER_SECRET)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  const workerRes = await fetch(`${RENDER_WORKER_URL}/render`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `HMAC ${timestamp}.${sig}`,
    },
    body: rawBody,
  });

  if (!workerRes.ok) {
    const txt = await workerRes.text();
    throw new Error(`Railway worker error ${workerRes.status}: ${txt.slice(0, 300)}`);
  }

  const workerData = await workerRes.json();

  // Worker processes async and calls complete-broll-render when done
  return json({ ok: true, job_id: workerData.job_id });
}
