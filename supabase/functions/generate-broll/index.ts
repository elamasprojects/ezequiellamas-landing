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
// Kling usa auth JWT con par AK/SK: KLING_API_KEY como `iss`, KLING_SECRET_KEY
// para firmar HS256. Endpoint global por default; override con KLING_API_BASE.
const KLING_API_KEY = Deno.env.get("KLING_API_KEY");
const KLING_SECRET_KEY = Deno.env.get("KLING_SECRET_KEY");
const KLING_API_BASE = Deno.env.get("KLING_API_BASE") ?? "https://api.klingai.com";

// Variante 2 — Railway render worker (compartido con carruseles)
const RENDER_WORKER_URL = Deno.env.get("RENDER_WORKER_URL");
const RENDER_WORKER_SECRET = Deno.env.get("RENDER_WORKER_SECRET");

// Modelo de imagen — mismo patrón validado que `generate-cover`.
const GEMINI_FLASH = "gemini-3.1-flash-image-preview"; // Nano Banana 2
// Modelo de video — kling-v2-1 es el default oficial para image2video y soporta `mode`.
const KLING_MODEL = "kling-v2-1";

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

function base64UrlEncode(input: Uint8Array | string): string {
  let b64: string;
  if (typeof input === "string") {
    b64 = btoa(input);
  } else {
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < input.length; i += chunk) {
      binary += String.fromCharCode(
        ...input.subarray(i, Math.min(i + chunk, input.length)),
      );
    }
    b64 = btoa(binary);
  }
  return b64.replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

// JWT HS256 para auth de Kling: header {alg:HS256, typ:JWT}, payload
// {iss: AK, exp: now+1800, nbf: now-5}, firmado con SK.
function signKlingJwt(accessKey: string, secretKey: string): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: accessKey, exp: now + 1800, nbf: now - 5 };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;
  const sigBuffer = createHmac("sha256", secretKey)
    .update(signingInput)
    .digest();
  const sigBytes = sigBuffer instanceof Uint8Array
    ? sigBuffer
    : new Uint8Array(sigBuffer);
  const sigB64 = base64UrlEncode(sigBytes);
  return `${signingInput}.${sigB64}`;
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
      .update({
        generation_status: "failed",
        generation_error: "no_variant_selected",
      })
      .eq("id", broll_suggestion_id);
    return json({ error: "no_variant_selected" }, 400);
  }

  try {
    if (variant === "v1") {
      return await generateV1(broll, ownerId, admin);
    } else {
      return await generateV2(broll, ownerId, admin);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await admin
      .from("broll_suggestions")
      .update({
        generation_status: "failed",
        generation_error: msg.slice(0, 1000),
      })
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
  if (!GEMINI_API_KEY || !KLING_API_KEY || !KLING_SECRET_KEY) {
    await admin
      .from("broll_suggestions")
      .update({ generation_status: "failed" })
      .eq("id", broll.id);
    return json(
      {
        error: "v1_not_configured",
        detail:
          "GEMINI_API_KEY, KLING_API_KEY y KLING_SECRET_KEY deben estar seteados en Edge Function secrets.",
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

  // ── Step 2: animar con Kling (image-to-video, JWT HS256) ─────────────────
  const klingJwt = signKlingJwt(KLING_API_KEY, KLING_SECRET_KEY);

  const klingRes = await fetch(
    `${KLING_API_BASE}/v1/videos/image2video`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${klingJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: imageUrl,
        prompt: animationPrompt,
        model_name: KLING_MODEL,
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

  // Poll Kling hasta completar (max 90s). El JWT dura 30min, alcanza para el polling.
  let videoUrl: string | null = null;
  for (let i = 0; i < 18; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const pollRes = await fetch(
      `${KLING_API_BASE}/v1/videos/image2video/${taskId}`,
      { headers: { Authorization: `Bearer ${klingJwt}` } },
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
// Variante 2: Hyperframes (WordStack template) via Railway worker
// ──────────────────────────────────────────────────────────────────────────────
//
// Payload shape exacto que el worker valida con zod (ver render-worker/src/index.ts):
//   { kind:"broll", broll_suggestion_id, owner_id, template:"WordStack",
//     content:{ words[], cueText, caption }, style_id, style_template_code,
//     output_format:"mp4" }
//
// El worker responde 202 inmediato; procesa async y notifica via HMAC al edge
// `complete-broll-render` que actualiza generation_status='done'/'failed'.

async function generateV2(
  // deno-lint-ignore no-explicit-any
  broll: any,
  ownerId: string,
  // deno-lint-ignore no-explicit-any
  admin: any,
): Promise<Response> {
  if (!RENDER_WORKER_URL || !RENDER_WORKER_SECRET) {
    await admin
      .from("broll_suggestions")
      .update({
        generation_status: "failed",
        generation_error: "v2_not_configured: RENDER_WORKER_URL/RENDER_WORKER_SECRET missing",
      })
      .eq("id", broll.id);
    return json(
      {
        error: "v2_not_configured",
        detail: "RENDER_WORKER_URL and RENDER_WORKER_SECRET must be set.",
      },
      503,
    );
  }

  // Validar selected_words (WordStack requiere 1..8 palabras)
  const rawWords: string[] = Array.isArray(broll.selected_words)
    ? broll.selected_words.filter((w: unknown): w is string => typeof w === "string" && w.trim().length > 0)
    : [];
  if (rawWords.length === 0) {
    await admin
      .from("broll_suggestions")
      .update({
        generation_status: "failed",
        generation_error:
          "wordstack_requires_selected_words: marcá palabras del guion para este B-roll antes de generar",
      })
      .eq("id", broll.id);
    return json({ error: "wordstack_requires_selected_words" }, 400);
  }
  if (rawWords.length > 8) {
    await admin
      .from("broll_suggestions")
      .update({
        generation_status: "failed",
        generation_error: `too_many_words: max 8 (got ${rawWords.length})`,
      })
      .eq("id", broll.id);
    return json({ error: "too_many_words" }, 400);
  }

  const style = broll.broll_styles;

  const payload = {
    kind: "broll" as const,
    broll_suggestion_id: broll.id as string,
    owner_id: ownerId,
    template: "WordStack" as const,
    content: {
      words: rawWords,
      cueText: (broll.cue_text as string | null) ?? null,
      caption: (broll.suggestion as string | null) ?? null,
    },
    style_id: (style?.id as string | undefined) ?? null,
    style_template_code: (style?.template_code as string | null) ?? null,
    output_format: "mp4" as const,
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
    const detail = `worker_${workerRes.status}: ${txt.slice(0, 600)}`;
    await admin
      .from("broll_suggestions")
      .update({ generation_status: "failed", generation_error: detail })
      .eq("id", broll.id);
    throw new Error(detail);
  }

  const workerData = await workerRes.json();
  // Worker procesa async; el callback complete-broll-render actualiza la fila.
  return json({
    ok: true,
    broll_suggestion_id: workerData.broll_suggestion_id ?? broll.id,
  });
}
