// supabase/functions/generate-cover/index.ts
//
// Genera una portada de video usando arquitectura de prompts en 3 capas:
//   Capa 1: System prompt maestro (metodología invariante de marca)
//   Capa 2: Estilo de portada seleccionado (system_prompt del cover_style)
//   Capa 3: Serie de contenido (cover_system_prompt de la serie, si aplica)
//
// Flujo: Claude extrae la idea fuerza + construye el prompt de imagen → OpenAI DALL-E 3 genera → se sube a cover-renders
//
// Body: { cover_id: string, force?: boolean, instruction?: string }
// Returns: { ok: true, generated_image_url: string, idea_fuerza: string }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ============================================================================
// CAPA 1 — System prompt maestro (invariante de marca)
// ============================================================================
const MASTER_SYSTEM_PROMPT = `Sos un generador de portadas para videos cortos de @ezequiellamass.

Tu tarea: analizar el contenido del video y producir un prompt detallado en inglés para generar una portada de video profesional con DALL-E 3.

## METODOLOGÍA

### 1. IDEA FUERZA
Destilá el contenido a 2-4 palabras de máximo impacto. Es la promesa o insight central del video.
- Usá palabras con peso emocional o alta tensión
- Evitá genéricos: "importante", "útil", "básico", "clave"
- Ejemplos: "Sin pagar.", "Construilas.", "Más caro. Más rápido.", "Delegás el camino.", "Cero clicks."

### 2. JERARQUÍA VISUAL
- Sujeto principal (founder o producto) destacado por contraste sobre el fondo
- Texto legible al 100%, jerarquía clara: headline > subtítulo
- Composición guía el ojo hacia el punto focal

### 3. BRANDING INVARIANTE
- Tipografía Poppins: bold para headline, medium para cuerpo
- Glow violeta/morado (#7c3aed) en texto clave y bordes de elementos
- Estética: minimalista, dark, técnica, anti-guru
- Paleta: fondo oscuro (#0a0a0a o gradiente dark), violeta como acento, blanco para texto
- Sin emojis decorativos. Sin hype vacío. Sin clichés de coach.

### 4. OUTPUT ESPERADO
Respondé SOLO con JSON sin ningún otro texto:
{
  "idea_fuerza": "2-4 palabras de impacto",
  "image_prompt": "prompt detallado en inglés para DALL-E 3 que incluya: sujeto y composición, fondo y atmósfera, texto visible (la idea fuerza en Poppins bold), estilo y mood, specs técnicos (sharp, high contrast, professional thumbnail quality)"
}

El image_prompt debe ser auto-suficiente para que DALL-E 3 pueda generar la imagen sin contexto adicional.`;

// ============================================================================
// Tipos
// ============================================================================
interface RequestBody {
  cover_id: string;
  force?: boolean;
  instruction?: string;
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

// ============================================================================
// Main handler
// ============================================================================
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  if (!ANTHROPIC_API_KEY) return json({ error: "missing_anthropic_key" }, 500);
  if (!OPENAI_API_KEY) return json({ error: "missing_openai_key" }, 500);

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

  const { cover_id, force = false, instruction } = body;
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
    .single() as { data: CoverRow | null; error: unknown };

  if (coverErr || !cover) return json({ error: "cover_not_found" }, 404);
  if (cover.status === "done" && !force) return json({ error: "already_generated_use_force" }, 409);

  // Marcar como generando
  const newStatus = instruction ? "editing" : "generating";
  await admin.from("covers").update({ status: newStatus, generation_error: null }).eq("id", cover_id);

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

    // Mensaje de usuario
    const instructionLine = instruction ? `\nInstrucción de edición: ${instruction}` : "";
    const userMessage = `Título del video: ${contentTitle || "(sin título)"}
Aspect ratio de la portada: ${cover.aspect_ratio}${instructionLine}

${content}

${instruction
  ? `La portada ya existe. Aplicá la instrucción de edición manteniendo el estilo y branding invariante. Generá un nuevo prompt para DALL-E 3 que incorpore el cambio pedido.`
  : "Analizá el contenido, extraé la idea fuerza y construí el prompt para DALL-E 3."}`;

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

    // Tamaño según aspect ratio
    const sizeMap: Record<string, string> = {
      "9:16": "1024x1792",
      "16:9": "1792x1024",
      "1:1": "1024x1024",
    };
    const size = sizeMap[cover.aspect_ratio] ?? "1024x1792";

    // Llamada a OpenAI DALL-E 3
    const dalleRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: imagePrompt,
        n: 1,
        size,
        quality: "hd",
        response_format: "url",
      }),
    });

    if (!dalleRes.ok) {
      const detail = await dalleRes.text();
      throw new Error(`openai_${dalleRes.status}: ${detail.slice(0, 300)}`);
    }
    const dalleData = await dalleRes.json();
    const tempUrl = dalleData.data?.[0]?.url as string | undefined;
    if (!tempUrl) throw new Error("no_image_url_from_openai");

    // Descargar imagen y subir a cover-renders
    const imgRes = await fetch(tempUrl);
    if (!imgRes.ok) throw new Error("failed_to_download_image");
    const imgBuffer = await imgRes.arrayBuffer();

    const storagePath = `${userId}/${cover_id}.png`;
    const { error: uploadErr } = await admin.storage
      .from("cover-renders")
      .upload(storagePath, imgBuffer, { contentType: "image/png", upsert: true });
    if (uploadErr) throw new Error(`upload_failed: ${uploadErr.message}`);

    // Signed URL (4 horas — se refresca desde el frontend)
    const { data: signedData } = await admin.storage
      .from("cover-renders")
      .createSignedUrl(storagePath, 4 * 3600);
    const finalUrl = signedData?.signedUrl ?? tempUrl;

    // Actualizar fila
    await admin.from("covers").update({
      status: "done",
      generated_image_url: finalUrl,
      generated_image_path: storagePath,
      prompt_used: imagePrompt,
      idea_fuerza: ideaFuerza || null,
    }).eq("id", cover_id);

    return json({ ok: true, generated_image_url: finalUrl, idea_fuerza: ideaFuerza });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await admin.from("covers").update({ status: "failed", generation_error: msg }).eq("id", cover_id);
    return json({ error: "generation_failed", detail: msg }, 502);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
