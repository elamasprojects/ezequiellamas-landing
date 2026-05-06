// generate-captions — genera captions para IG/TikTok/YouTube a partir de una transcripción.
// Detecta CTA al final del video ("comentá X", "escribe X", etc.) y lo coloca al INICIO del caption.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const CLAUDE_MODEL = "claude-sonnet-4-6";
const CLAUDE_MAX_TOKENS = 2000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Claude a veces emite secuencias \uXXXX literales en vez de caracteres decodificados.
function decodeUnicodeEscapes<T>(value: T): T {
  if (typeof value === "string") {
    return value
      .replace(
        /\\u([dD][89aAbB][0-9a-fA-F]{2})\\u([dD][c-fC-F][0-9a-fA-F]{2})/g,
        (_m, hi, lo) => String.fromCharCode(parseInt(hi, 16), parseInt(lo, 16)),
      )
      .replace(
        /\\u([0-9a-fA-F]{4})/g,
        (_m, hex) => String.fromCharCode(parseInt(hex, 16)),
      ) as T;
  }
  if (Array.isArray(value)) return value.map((v) => decodeUnicodeEscapes(v)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = decodeUnicodeEscapes(v);
    }
    return out as T;
  }
  return value;
}

interface CaptionsToolResult {
  caption_default: string;
  captions: {
    instagram?: string;
    tiktok?: string;
    youtube?: string;
  };
  youtube_title: string;
  hashtags: string[];
}

const EMIT_CAPTIONS_TOOL = {
  name: "emit_captions",
  description: "Emite los captions generados para todas las plataformas pedidas.",
  input_schema: {
    type: "object",
    properties: {
      caption_default: {
        type: "string",
        description:
          "Caption base minimalista. Si hay CTA detectado, debe empezar con él. Aplica a plataformas sin override.",
      },
      captions: {
        type: "object",
        description: "Captions específicos por plataforma, cada uno comenzando con el CTA si existe.",
        properties: {
          instagram: { type: "string" },
          tiktok: { type: "string" },
          youtube: { type: "string" },
        },
        required: ["instagram", "tiktok", "youtube"],
      },
      youtube_title: {
        type: "string",
        description: "Título del video para YouTube, entre 40-80 caracteres. Descriptivo, sin clickbait.",
      },
      hashtags: {
        type: "array",
        items: { type: "string" },
        description: "Hashtags sin #, en minúsculas, específicos del nicho. Entre 5 y 10.",
      },
    },
    required: ["caption_default", "captions", "youtube_title", "hashtags"],
  },
};

function sanitizeHashtag(tag: string): string {
  return tag.replace(/^#+/, "").toLowerCase().replace(/[^a-z0-9áéíóúñ]/g, "");
}

function buildSystemPrompt(formatName?: string, formatDescription?: string): string {
  const formatBlock = formatName
    ? `\nFormato del video: "${formatName}"${formatDescription ? ` — ${formatDescription}` : ""}.`
    : "";

  return `Sos un copywriter para redes sociales. Voz argentina, directa, sin relleno.${formatBlock}

## REGLA DE CTA (CRÍTICA)
Leé el FINAL de la transcripción. Si el creador dijo algo como:
- "comentá X", "escribí X en los comentarios", "comenten X"
- "mandame un mensaje con X", "enviame X"
- "respondé con X para recibir Y"
- cualquier llamada a acción de engagement o entrega de recurso

→ Ese CTA va AL INICIO de cada caption, antes de cualquier otra cosa.
Ejemplo: "Comentá AGENCIA y te mando el template gratis.\n\n[resto del caption]"

Si no hay ese tipo de CTA → empezá directo con el hook del caption.

## REGLAS DE ESCRITURA
- Primera persona, sin "En este video..." ni "Hoy te traigo..."
- Sin emojis (solo si forman parte literal del CTA del video)
- Sin hashtags en el cuerpo (van solo en el campo hashtags)
- Sin frases genéricas: "¡No te lo pierdas!", "Dale like", "Seguime para más"
- Sin AI-tells: nada de "spoiler:", "—" dramáticos, "la realidad es que", "básicamente", "literalmente"
- Tono humano: como alguien que sabe de lo que habla y no necesita vender de más

## LONGITUDES POR PLATAFORMA
- Instagram: apuntá a 150-400 chars. Puede tener contexto breve después del CTA si el tema lo vale.
- TikTok: muy corto, máximo 150 chars. Solo el CTA o el gancho, nada más.
- YouTube: hasta 400 chars, algo más de contexto sobre el valor del video.
- YouTube title: 40-80 chars, descriptivo, incluye el tema central, sin "EN 2024" ni "¡INCREÍBLE!".

## HASHTAGS
5-10 hashtags. Específicos del nicho, no genéricos ("viral", "contenido", "fyp" están prohibidos). En minúsculas, sin #.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const scheduled_post_id =
      typeof body?.scheduled_post_id === "string" ? body.scheduled_post_id : null;
    const bunny_video_id =
      typeof body?.bunny_video_id === "string" ? body.bunny_video_id : null;
    const video_storage_path =
      typeof body?.video_storage_path === "string" ? body.video_storage_path : null;
    const format_id = typeof body?.format_id === "string" ? body.format_id : null;
    const force_regenerate = body?.force_regenerate === true;
    const platforms: string[] = Array.isArray(body?.platforms)
      ? body.platforms
      : ["instagram", "tiktok", "youtube"];

    // Transcript: puede venir inline, o lo sacamos del cache del scheduled_post, o transcribimos el video.
    let transcript: string | null =
      typeof body?.transcript === "string" && body.transcript.trim()
        ? body.transcript.trim()
        : null;

    if (!transcript && scheduled_post_id) {
      const { data: post } = await userClient
        .from("scheduled_posts")
        .select("transcript, transcript_status")
        .eq("id", scheduled_post_id)
        .single();
      if (post?.transcript_status === "done" && post.transcript) {
        transcript = post.transcript;
      }
    }

    if (!transcript) {
      if (!bunny_video_id && !video_storage_path && !scheduled_post_id) {
        return json(
          {
            error:
              "Se requiere transcript, o alguno de: bunny_video_id / video_storage_path / scheduled_post_id para transcribir.",
          },
          400,
        );
      }
      const transcribeBody: Record<string, unknown> = { force: force_regenerate };
      if (bunny_video_id) transcribeBody.bunny_video_id = bunny_video_id;
      if (video_storage_path) transcribeBody.video_storage_path = video_storage_path;
      if (scheduled_post_id) transcribeBody.scheduled_post_id = scheduled_post_id;

      const transcribeRes = await userClient.functions.invoke("transcribe-bunny-video", {
        body: transcribeBody,
      });
      if (transcribeRes.error) {
        return json(
          { error: `Transcripción falló: ${transcribeRes.error.message}` },
          502,
        );
      }
      const td = transcribeRes.data as { transcript?: string; error?: string } | null;
      if (td?.error) return json({ error: td.error }, 502);
      transcript = td?.transcript ?? null;
    }

    if (!transcript) {
      return json({ error: "No se pudo obtener la transcripción." }, 400);
    }

    // Formato opcional
    let formatName: string | undefined;
    let formatDescription: string | undefined;
    if (format_id) {
      const { data: f } = await userClient
        .from("formats")
        .select("name, description")
        .eq("id", format_id)
        .maybeSingle();
      if (f) {
        formatName = f.name ?? undefined;
        formatDescription = f.description ?? undefined;
      }
    }

    const systemPrompt = buildSystemPrompt(formatName, formatDescription);

    const userMessage = [
      "Transcripción del video:",
      `"""\n${transcript.slice(0, 12000)}\n"""`,
      "",
      `Plataformas a generar: ${platforms.join(", ")}`,
      "",
      "Analizá el final de la transcripción, detectá el CTA si existe, y generá los captions.",
      "Llamá a emit_captions con el resultado.",
    ].join("\n");

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: CLAUDE_MAX_TOKENS,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
        tools: [EMIT_CAPTIONS_TOOL],
        tool_choice: { type: "tool", name: "emit_captions" },
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      return json({ error: `Claude API ${claudeRes.status}: ${errText.slice(0, 400)}` }, 502);
    }

    const claudeData = (await claudeRes.json()) as {
      content: Array<{ type: string; name?: string; input?: CaptionsToolResult }>;
    };

    const toolBlock = (claudeData.content ?? []).find(
      (b) => b.type === "tool_use" && b.name === "emit_captions",
    );
    if (!toolBlock?.input) {
      return json({ error: "Claude no retornó el bloque emit_captions." }, 502);
    }

    const result = decodeUnicodeEscapes(toolBlock.input);

    const cleanHashtags = (result.hashtags ?? [])
      .map(sanitizeHashtag)
      .filter((t) => t.length > 0)
      .slice(0, 10);

    const cleanTitle = (result.youtube_title ?? "").slice(0, 100).trim();

    const filteredCaptions: Record<string, string> = {};
    for (const platform of platforms) {
      const cap = result.captions[platform as keyof typeof result.captions];
      if (cap) filteredCaptions[platform] = cap.trim();
    }

    return json({
      ok: true,
      caption_default: (result.caption_default ?? "").trim(),
      captions: filteredCaptions,
      youtube_title: cleanTitle,
      hashtags: cleanHashtags,
      used_format: !!formatName,
    });
  } catch (err) {
    return json({ error: String(err instanceof Error ? err.message : err) }, 500);
  }
});
