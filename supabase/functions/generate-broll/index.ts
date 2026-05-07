// supabase/functions/generate-broll/index.ts
//
// Dispatches B-roll generation for a single broll_suggestion row.
//
// Variant 1 (v1): Gemini Nano Banana 2 → imagen subida a `broll-renders` →
//                 Kling (image-to-video) → MP4 final
// Variant 2 (v2): Remotion + Hypermotion via Railway render worker (mismo
//                 patrón que carruseles)
//
// Body: { broll_suggestion_id: string }
// Returns: { ok: boolean, output_url?: string, job_id?: string }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Variante 1 — Gemini (imagen) + Kling (image-to-video)
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const KLING_API_KEY = Deno.env.get("KLING_API_KEY");

// Variante 2 — Railway render worker (compartido con carruseles)
const RENDER_WORKER_URL = Deno.env.get("RENDER_WORKER_URL");
const RENDER_WORKER_SECRET = Deno.env.get("RENDER_WORKER_SECRET");

// Modelo de imagen — mismo patrón validado que `generate-cover`.
const GEMINI_FLASH = "gemini-3.1-flash-image-preview"; // Nano Banana 2

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  thought?: boolean;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
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
  if (!broll_suggestion_id) {
    return json({ error: "broll_suggestion_id_required" }, 400);
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Cargar el broll con estilo y owner_id del script (RLS scopes al dueño).
  const { data: broll, error: brollErr } = await userClient
    .from("broll_suggestions")
    .select("*, broll_styles(*), scripts!inner(owner_id)")
    .eq("id", broll_suggestion_id)
    .maybeSingle();

  if (brollErr) {
    return json({ error: "load_failed", detail: brollErr.message }, 500);
  }
  if (!broll) return json({ error: "broll_not_found" }, 404);
  if (!broll.requested) return json({ error: "broll_not_requested" }, 400);
  if (
    broll.generation_status === "processing" ||
    broll.generation_status === "queued"
  ) {
    return json({ error: "already_generating" }, 409);
  }

  const ownerId = (broll.scripts as { owner_id?: string } | null)?.owner_id;
  if (!ownerId) return json({ error: "owner_not_found" }, 500);

  // Marcar como queued
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
      return await generateV1(broll, ownerId, admin);
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
// Variante 1: Gemini Nano Banana 2 → Kling
// ──────────────────────────────────────────────────────────────────────────────

async function generateV1(
  // deno-lint-ignore no-explicit-any
  broll: any,
  ownerId: string,
  // deno-lint-ignore no-explicit-any
  admin: any,
): Promise<Response> {
  if (!GEMINI_API_KEY || !KLING_API_KEY) {
    await admin
      .from("broll_suggestions")
      .update({ generation_status: "failed" })
      .eq("id", broll.id);
    return json(
      {
        error: "v1_not_configured",
        detail:
          "GEMINI_API_KEY y KLING_API_KEY deben estar seteados en Edge Function secrets.",
      },
      503,
    );
  }

  const style = broll.broll_styles;
  const imagePrompt = [style?.image_prompt, broll.image_description]
    .filter(Boolean)
    .join("\n\n");

  const animationPrompt = [style?.animation_prompt, broll.animation_description]
    .filter(Boolean)
    .join("\n\n");

  if (!imagePrompt) throw new Error("missing_image_prompt");

  await admin
    .from("broll_suggestions")
    .update({ generation_status: "processing" })
    .eq("id", broll.id);

  // ── Step 1: imagen con Gemini Nano Banana 2 ──────────────────────────────
  const geminiUrl =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_FLASH}:generateContent`;

  const geminiRes = await fetch(geminiUrl, {
    method: "POST",
    headers: {
      "x-goog-api-key": GEMINI_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: imagePrompt }] }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: { aspectRatio: "9:16", imageSize: "2K" },
      },
    }),
  });

  if (!geminiRes.ok) {
    const detail = await geminiRes.text();
    throw new Error(`gemini_${geminiRes.status}: ${detail.slice(0, 300)}`);
  }
  const geminiData = await geminiRes.json();

  const finishReason = geminiData.candidates?.[0]?.finishReason;
  if (finishReason === "SAFETY" || finishReason === "PROHIBITED_CONTENT") {
    throw new Error(`safety_block: ${finishReason}`);
  }

  const responseParts: GeminiPart[] =
    geminiData.candidates?.[0]?.content?.parts ?? [];
  let imageBase64: string | null = null;
  let imageMime = "image/png";
  for (const part of responseParts) {
    if (part.thought) continue;
    if (part.inlineData?.data) {
      imageBase64 = part.inlineData.data;
      imageMime = part.inlineData.mimeType || "image/png";
      break;
    }
  }
  if (!imageBase64) throw new Error("no_image_from_gemini");

  // Subir a `broll-renders` y firmar URL para Kling (1h TTL).
  const ext = imageMime === "image/jpeg"
    ? "jpg"
    : imageMime === "image/webp"
    ? "webp"
    : "png";
  const storagePath = `${ownerId}/${broll.id}.${ext}`;
  const imgBytes = base64ToBytes(imageBase64);
  const { error: uploadErr } = await admin.storage
    .from("broll-renders")
    .upload(storagePath, imgBytes, { contentType: imageMime, upsert: true });
  if (uploadErr) throw new Error(`upload_failed: ${uploadErr.message}`);

  const { data: signedData, error: signErr } = await admin.storage
    .from("broll-renders")
    .createSignedUrl(storagePath, 3600);
  if (signErr || !signedData?.signedUrl) {
    throw new Error(`sign_url_failed: ${signErr?.message ?? "no_signed_url"}`);
  }
  const imageUrl = signedData.signedUrl;

  // ── Step 2: animar con Kling (image-to-video) ────────────────────────────
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
    throw new Error(`kling_${klingRes.status}: ${txt.slice(0, 300)}`);
  }

  const klingData = await klingRes.json();
  const taskId: string = klingData.data?.task_id;
  if (!taskId) throw new Error("kling_no_task_id");

  // Poll Kling hasta completar (max 90s)
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
    if (status === "failed") throw new Error("kling_task_failed");
  }

  if (!videoUrl) throw new Error("kling_timeout_90s");

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
// Variante 2: Remotion + Hypermotion via Railway worker (sin cambios)
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
    // Callback para que el worker escriba output_url al terminar
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
    throw new Error(
      `Railway worker error ${workerRes.status}: ${txt.slice(0, 300)}`,
    );
  }

  const workerData = await workerRes.json();

  // Worker procesa async y llama a complete-broll-render al terminar
  return json({ ok: true, job_id: workerData.job_id });
}
