// supabase/functions/generate-cover/index.ts
//
// Genera una portada de video con arquitectura de prompts en 3 capas:
//   Capa 1: System prompt maestro (metodología invariante de marca)
//   Capa 2: Estilo de portada seleccionado (system_prompt del cover_style)
//   Capa 3: Serie de contenido (cover_system_prompt de la serie, si aplica)
//
// Flujo: Claude extrae idea fuerza + arma image_prompt → Gemini Nano Banana 2/Pro
// genera la imagen → se sube a `cover-renders`. Si viene `instruction` y la portada
// ya tiene `generated_image_path`, hace image-to-image (pasa la imagen previa como
// inlineData) para preservar continuidad visual.
//
// Body: { cover_id: string, force?: boolean, instruction?: string, quality?: "standard" | "premium" }
// Returns: { ok: true, generated_image_url: string, idea_fuerza: string, model: string }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GEMINI_FLASH = "gemini-3.1-flash-image-preview";
const GEMINI_PRO = "gemini-3-pro-image-preview";

// ============================================================================
// CAPA 1 — System prompt maestro (invariante de marca)
// IMPORTANTE: el branding acá es el del landing real ezequiellamas.com,
// no inventar paleta ni tipografías. Si alguien edita: comparar contra
// `src/index.css` (--ll-* tokens) y los headings .landing.hero.
// ============================================================================
const MASTER_SYSTEM_PROMPT = `Sos un generador de portadas para videos cortos de @ezequiellamass.

Tu tarea: analizar el contenido del video y producir un prompt detallado en inglés para generar una portada de video profesional con un modelo de imagen de Google (Gemini Nano Banana).

## METODOLOGÍA

### 1. IDEA FUERZA
Destilá el contenido a 2-4 palabras de máximo impacto. Es la promesa o insight central del video.
- Usá palabras con peso emocional o alta tensión
- Evitá genéricos: "importante", "útil", "básico", "clave"
- Ejemplos: "Sin pagar.", "Construilas.", "Más caro. Más rápido.", "Delegás el camino.", "Cero clicks."

### 2. JERARQUÍA VISUAL
- Sujeto principal (founder o producto) destacado por contraste sobre el fondo
- Texto legible al 100%, jerarquía clara: eyebrow > headline > sub
- Composición guía el ojo hacia el punto focal

### 3. BRANDING — IDÉNTICO AL LANDING ezequiellamas.com (NO INVENTAR)

PALETA EXACTA (hex literales, sin variaciones):
- Fondo principal: deep matte black #0a0a0a
- Superficies / cards: #111111 o #161616
- Borde sutil: #1e1e1e
- Texto principal: warm off-white #e8e4de (NO blanco puro #ffffff)
- Texto secundario / muted: #8a8580
- Texto dim: #5a5550
- ACENTO PRIMARIO: electric lime / yellow-green #c8ff00. Usado SOLO en:
  · italic emphasis words dentro del headline (palabra de énfasis)
  · eyebrow / kicker tags en mono uppercase
  · subtle radial-glow bloom de fondo a opacity baja (~10-15%)
  · pequeños dots / markers / underlines
- Acento secundario warm: orange #ff6b35. Usado para glow secundario en esquinas opuestas (mismo opacity bajo).
- Acento blue (raro): #4a9eff
- PROHIBIDO: violeta, magenta, morado, #7c3aed, neon excesivo, gradientes saturados de colores chillones.

TIPOGRAFÍA EXACTA:
- Headline / idea fuerza: 'Instrument Serif' (editorial serif, parecido a ITC Garamond italic). Italic para la palabra de énfasis. line-height 1, letter-spacing -0.04em (tight kerning). La palabra italic va coloreada en lime accent #c8ff00.
- Eyebrow / kicker / tag: 'JetBrains Mono' (monospace), ALL CAPS, letter-spacing ~0.25em, tamaño chico, color lime accent #c8ff00.
- Body / subtítulo / disclaimers: 'DM Sans' (geometric sans-serif), peso 300-400, color text-muted #8a8580.
- PROHIBIDO: Poppins, Inter, Helvetica, Arial, Montserrat, Roboto. SIEMPRE Instrument Serif + DM Sans + JetBrains Mono. Si el modelo no tiene una de las tres, usar el sustituto MÁS cercano (serif editorial italic; geometric sans clean; tech monospace) — nunca caer a Poppins por default.

ESTÉTICA / MOOD:
- Editorial dark, minimalista, técnico, anti-guru, building-in-public
- Suave bloom radial detrás del sujeto: lime accent (#c8ff00) en una esquina + orange (#ff6b35) en la opuesta, ambos a opacity baja, sin saturar
- Sin emojis decorativos. Sin hype vacío. Sin clichés de coach. Sin glassmorphism. Sin neon glow excesivo.
- Sensación de "press kit de agencia técnica anti-guru", NO de motivational guru ni de SaaS template.

### 4. REFERENCIA DE LA CARA DEL FOUNDER
Cuando el formato de la portada requiere mostrar al founder (Ezequiel Lamas), se va a adjuntar como REFERENCIA visual la foto real de su cara como primer attachment del prompt al modelo de imagen. En tu image_prompt:
- Si la cobertura muestra al founder: instruí EXPLÍCITAMENTE al modelo "use the founder's face EXACTLY as shown in the reference image — same identity, same features, same skin tone, same facial structure. Do NOT generate a different face."
- Si el formato es solo producto / dato / abstracto (sin founder en pantalla): no menciones la referencia, el modelo va a ignorarla.
- Casi todos los formatos del catálogo muestran al founder, así que por default asumí que sí.

### 5. OUTPUT ESPERADO
Respondé SOLO con JSON sin ningún otro texto:
{
  "idea_fuerza": "2-4 palabras de impacto",
  "image_prompt": "prompt detallado en inglés para el modelo de imagen, que incluya: sujeto y composición (cuando hay founder, especificar 'use the founder's face from the reference image'), fondo y atmósfera (deep matte black #0a0a0a + soft radial bloom of lime #c8ff00 + warm orange #ff6b35), texto visible (idea fuerza con la palabra de énfasis en italic 'Instrument Serif' coloreada en #c8ff00; eyebrow en 'JetBrains Mono' uppercase tracked-out 0.25em coloreada #c8ff00 si aplica), estilo y mood (editorial dark minimalista, anti-guru, técnico), specs técnicos (sharp, high contrast, professional thumbnail quality, vertical 9:16 si aplica). Incluí explícitamente las palabras exactas entre comillas, indicando cuáles van en italic-lime Instrument Serif y cuáles en mono-eyebrow JetBrains Mono."
}

El image_prompt debe ser auto-suficiente para que el modelo genere la imagen sin contexto adicional.`;

// ============================================================================
// Tipos
// ============================================================================
interface RequestBody {
  cover_id: string;
  force?: boolean;
  instruction?: string;
  quality?: "standard" | "premium";
}

interface CoverRow {
  id: string;
  owner_id: string;
  title: string | null;
  aspect_ratio: string;
  status: string;
  generated_image_path: string | null;
  prompt_used: string | null;
  script_id: string | null;
  video_id: string | null;
  cover_style_id: string | null;
  series_id: string | null;
}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  thought?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, Math.min(i + chunk, bytes.length)),
    );
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function isValidAspectRatio(r: string): boolean {
  return ["1:1", "9:16", "16:9", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4"].includes(r);
}

// ============================================================================
// Main handler
// ============================================================================
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  if (!ANTHROPIC_API_KEY) return json({ error: "missing_anthropic_key" }, 500);
  if (!GEMINI_API_KEY) return json({ error: "missing_gemini_key" }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401);

  const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userResult, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userResult.user) return json({ error: "unauthorized" }, 401);
  const userId = userResult.user.id;

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const { cover_id, force = false, instruction, quality = "standard" } = body;
  if (!cover_id) return json({ error: "cover_id_required" }, 400);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Cargar la portada con relaciones
  const { data: cover, error: coverErr } = await admin
    .from("covers")
    .select(`
      id, owner_id, title, aspect_ratio, status, generated_image_path, prompt_used,
      script_id, video_id, cover_style_id, series_id
    `)
    .eq("id", cover_id)
    .eq("owner_id", userId)
    .single<CoverRow>();

  if (coverErr || !cover) return json({ error: "cover_not_found" }, 404);
  if (cover.status === "done" && !force) {
    return json({ error: "already_generated_use_force" }, 409);
  }

  // CAS: solo arrancamos si nadie más está generando esta portada.
  // Permitimos disparar desde idle/done/failed/editing (con force) — y bloqueamos
  // si otra request ya está in-flight (status in_progress / generating / editing
  // sin haber pasado por done).
  const newStatus = instruction ? "editing" : "generating";
  const { data: claimed, error: claimErr } = await admin
    .from("covers")
    .update({ status: newStatus, generation_error: null })
    .eq("id", cover_id)
    .in("status", ["idle", "done", "failed"])
    .select("id")
    .maybeSingle();
  if (claimErr) return json({ error: "claim_failed", detail: claimErr.message }, 500);
  if (!claimed) {
    return json({ error: "already_in_progress" }, 409);
  }

  try {
    // Cargar script/video content
    let scriptContent = "";
    let videoContent = "";
    let contentTitle = cover.title ?? "";

    if (cover.script_id) {
      const { data: script } = await admin
        .from("scripts")
        .select("title, hook, generated_script, on_screen_text")
        .eq("id", cover.script_id)
        .single();
      if (script) {
        if (!contentTitle && script.title) contentTitle = script.title;
        scriptContent = [
          script.hook ? `HOOK: ${script.hook}` : "",
          script.generated_script ? `GUION:\n${script.generated_script}` : "",
          script.on_screen_text ? `TEXTO EN PANTALLA: ${script.on_screen_text}` : "",
        ]
          .filter(Boolean)
          .join("\n\n");
      }
    }

    if (cover.video_id) {
      const { data: video } = await admin
        .from("videos")
        .select("title, transcript")
        .eq("id", cover.video_id)
        .single();
      if (video) {
        if (!contentTitle && video.title) contentTitle = video.title;
        if (video.transcript) videoContent = `TRANSCRIPCIÓN:\n${video.transcript}`;
      }
    }

    const content = scriptContent || videoContent || "Sin contenido disponible";

    // Capa 2: Estilo seleccionado
    let styleLayer = "";
    if (cover.cover_style_id) {
      const { data: style } = await admin
        .from("cover_styles")
        .select("name, system_prompt, when_to_use")
        .eq("id", cover.cover_style_id)
        .single();
      if (style?.system_prompt) {
        styleLayer = `\n\n## ESTILO: ${style.name}\n${style.system_prompt}`;
        if (style.when_to_use) styleLayer += `\nCuándo usarlo: ${style.when_to_use}`;
      }
    }

    // Capa 3: Serie (si aplica)
    let seriesLayer = "";
    if (cover.series_id) {
      const { data: series } = await admin
        .from("series")
        .select("name, cover_system_prompt")
        .eq("id", cover.series_id)
        .single();
      if (series?.cover_system_prompt) {
        seriesLayer = `\n\n## SERIE: ${series.name}\n${series.cover_system_prompt}`;
      }
    }

    const systemPrompt = MASTER_SYSTEM_PROMPT + styleLayer + seriesLayer;

    // Mensaje de usuario para Claude
    const instructionLine = instruction ? `\nInstrucción de edición: ${instruction}` : "";
    const userMessage = `Título del video: ${contentTitle || "(sin título)"}
Aspect ratio de la portada: ${cover.aspect_ratio}${instructionLine}

${content}

${
  instruction
    ? "La portada ya existe (te van a pasar la imagen previa como referencia). Aplicá la instrucción de edición manteniendo el estilo y branding invariante. Generá un prompt nuevo que describa los cambios y todo lo que debe preservarse."
    : "Analizá el contenido, extraé la idea fuerza y construí el image_prompt."
}`;

    // Claude extrae idea_fuerza + genera image_prompt
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!claudeRes.ok) {
      const detail = await claudeRes.text();
      throw new Error(`claude_${claudeRes.status}: ${detail.slice(0, 300)}`);
    }
    const claudeData = await claudeRes.json();
    const claudeText = (claudeData.content?.[0]?.text ?? "") as string;

    let ideaFuerza = "";
    let imagePrompt = "";
    try {
      const match = claudeText.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        ideaFuerza = parsed.idea_fuerza ?? "";
        imagePrompt = parsed.image_prompt ?? "";
      }
    } catch {
      imagePrompt = claudeText.slice(0, 1000);
    }
    if (!imagePrompt) throw new Error("no_image_prompt_from_claude");

    // ─── Gemini ────────────────────────────────────────────────────────────
    const aspectRatio = isValidAspectRatio(cover.aspect_ratio)
      ? cover.aspect_ratio
      : "9:16";
    const imageSize = "2K";

    // Construir parts del request a Gemini en este orden:
    //   1. Cara del founder (cover_assets.asset_type='founder_photo' más reciente)
    //      → pasada como inlineData de referencia para que el modelo use SU cara exacta
    //      cuando el formato de la portada lo requiere (casi siempre).
    //   2. Cover previa (solo en edit) → para preservar continuidad visual.
    //   3. Texto del prompt (envuelto con notas que aclaran qué es cada attachment).
    const parts: Array<Record<string, unknown>> = [];
    let usedFounderRef = false;
    let usedImageToImage = false;

    // 1) Founder face reference — siempre que exista, lo adjuntamos.
    const { data: founderAsset } = await admin
      .from("cover_assets")
      .select("storage_path")
      .eq("owner_id", userId)
      .eq("asset_type", "founder_photo")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (founderAsset?.storage_path) {
      const { data: faceBlob, error: faceDlErr } = await admin.storage
        .from("cover-assets")
        .download(founderAsset.storage_path);
      if (!faceDlErr && faceBlob) {
        const faceBuf = new Uint8Array(await faceBlob.arrayBuffer());
        parts.push({
          inlineData: {
            mimeType: faceBlob.type || "image/png",
            data: bytesToBase64(faceBuf),
          },
        });
        usedFounderRef = true;
      }
    }

    // 2) Si es edit y hay imagen previa, pasarla como inlineData (image-to-image).
    if (instruction && cover.generated_image_path) {
      const { data: prevBlob, error: dlErr } = await admin.storage
        .from("cover-renders")
        .download(cover.generated_image_path);
      if (!dlErr && prevBlob) {
        const buf = new Uint8Array(await prevBlob.arrayBuffer());
        parts.push({
          inlineData: {
            mimeType: prevBlob.type || "image/png",
            data: bytesToBase64(buf),
          },
        });
        usedImageToImage = true;
      }
    }

    // 3) Texto. Envolvemos con notas explicando qué es cada attachment para que el
    // modelo no confunda la cara de referencia con la portada previa, etc.
    const refNotes: string[] = [];
    if (usedFounderRef) {
      refNotes.push(
        "[REFERENCE IMAGE — FOUNDER FACE] The first attached image is the actual face of the founder Ezequiel Lamas. When the cover features the founder, render his face EXACTLY as shown: same identity, same facial features, same skin tone, same hair. Do NOT invent a different face. If the cover does not feature the founder (product-only / abstract / data layout), ignore this reference.",
      );
    }
    if (usedImageToImage) {
      refNotes.push(
        `[REFERENCE IMAGE — PREVIOUS COVER] The ${usedFounderRef ? "second" : "first"} attached image is the previous version of this cover. Apply the requested edit while preserving the established branding, layout, and any other elements not explicitly mentioned in the change.`,
      );
    }
    const wrappedPrompt = refNotes.length > 0
      ? `${refNotes.join("\n\n")}\n\n---\n\n${imagePrompt}`
      : imagePrompt;
    parts.push({ text: wrappedPrompt });

    const geminiModel = quality === "premium" ? GEMINI_PRO : GEMINI_FLASH;
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`;

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "x-goog-api-key": GEMINI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: { aspectRatio, imageSize },
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

    // Parse parts: skip thought, capture inlineData (final image).
    const responseParts: GeminiPart[] = geminiData.candidates?.[0]?.content?.parts ?? [];
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

    // Upload a cover-renders
    const ext = imageMime === "image/jpeg" ? "jpg" : "png";
    const storagePath = `${userId}/${cover_id}.${ext}`;
    const imgBytes = base64ToBytes(imageBase64);
    const { error: uploadErr } = await admin.storage
      .from("cover-renders")
      .upload(storagePath, imgBytes, { contentType: imageMime, upsert: true });
    if (uploadErr) throw new Error(`upload_failed: ${uploadErr.message}`);

    // Signed URL solo para devolver al cliente (preview inmediato).
    // No la persistimos: el cliente firma on-demand desde generated_image_path
    // para evitar URLs stale después del TTL de 4h.
    const { data: signedData } = await admin.storage
      .from("cover-renders")
      .createSignedUrl(storagePath, 4 * 3600);
    const finalUrl = signedData?.signedUrl ?? "";

    await admin.from("covers").update({
      status: "done",
      generated_image_url: null,
      generated_image_path: storagePath,
      prompt_used: imagePrompt,
      idea_fuerza: ideaFuerza || null,
      generation_error: null,
    }).eq("id", cover_id);

    return json({
      ok: true,
      generated_image_url: finalUrl,
      idea_fuerza: ideaFuerza,
      model: geminiModel,
      image_to_image: usedImageToImage,
      founder_ref: usedFounderRef,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await admin
      .from("covers")
      .update({ status: "failed", generation_error: msg })
      .eq("id", cover_id);
    return json({ error: "generation_failed", detail: msg }, 502);
  }
});
