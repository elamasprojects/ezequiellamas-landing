// analyze-referent-video — toma un referent_videos row y le saca:
//   1) transcript (YT subtitles si hay, si no Whisper sobre audio del raw)
//   2) concept_summary (Claude tool_use con hook/format/angle/cta)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const CLAUDE_MODEL = "claude-sonnet-4-6";
const WHISPER_MAX_BYTES = 25 * 1024 * 1024;

// Videos at/above this duration get the long-form (structure-oriented) analysis.
const LONG_FORM_MIN_SECONDS = 180;
const SHORT_TRANSCRIPT_CAP = 12_000;
const LONG_TRANSCRIPT_CAP = 48_000; // ~50 min of speech

// Long transcripts get head (70%) + tail (30%) so the opening arc AND the
// closing/offer (which usually lands near the end) both reach the model.
function clipTranscriptForLong(t: string, cap: number): string {
  if (t.length <= cap) return t;
  const head = Math.floor(cap * 0.7);
  const tail = cap - head - 10;
  return `${t.slice(0, head)}\n[...]\n${t.slice(t.length - tail)}`;
}

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

// Claude's tool_use input occasionally arrives with literal `\uXXXX` sequences
// (6 chars: '\','u','0','0','e','1') instead of decoded characters (e.g. 'á').
// Walk the parsed tool input and decode them so accented Spanish prose is
// stored correctly. Handles surrogate pairs for non-BMP code points.
function decodeUnicodeEscapes<T>(value: T): T {
  if (typeof value === "string") {
    return value
      .replace(
        /\\u([dD][89aAbB][0-9a-fA-F]{2})\\u([dD][c-fC-F][0-9a-fA-F]{2})/g,
        (_m, hi, lo) =>
          String.fromCharCode(parseInt(hi, 16), parseInt(lo, 16)),
      )
      .replace(
        /\\u([0-9a-fA-F]{4})/g,
        (_m, hex) => String.fromCharCode(parseInt(hex, 16)),
      ) as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => decodeUnicodeEscapes(v)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = decodeUnicodeEscapes(v);
    }
    return out as T;
  }
  return value;
}

type Platform = "instagram" | "youtube" | "tiktok" | "other";

interface ReferentVideoRow {
  id: string;
  referent_id: string;
  platform: Platform;
  source_url: string;
  title: string | null;
  caption: string | null;
  views_total: number | null;
  video_duration: number | null;
  raw: Record<string, unknown> | null;
  transcript: string | null;
  transcript_status: string;
  concept_status: string;
  concept_summary: string | null;
  long_form_breakdown: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// SRT parsing for YouTube auto-subtitles
// ---------------------------------------------------------------------------

function parseSrt(text: string): string {
  return text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter(
      (line) =>
        line.trim().length > 0 &&
        !/^\d+$/.test(line.trim()) &&
        !/-->/.test(line),
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

interface YtSubtitle {
  language?: string;
  url?: string;
  text?: string;
  srt?: string;
  vtt?: string;
}

async function ytSubtitlesToText(raw: Record<string, unknown>): Promise<{ text: string; language: string } | null> {
  const subs = (raw.subtitles ?? raw.captions ?? []) as YtSubtitle[];
  if (!Array.isArray(subs) || subs.length === 0) return null;
  const score = (s: YtSubtitle) => {
    const lang = (s.language ?? "").toLowerCase();
    if (lang.includes("es-auto")) return 4;
    if (lang.startsWith("es")) return 3;
    if (lang.includes("auto")) return 2;
    return 1;
  };
  const sorted = [...subs].sort((a, b) => score(b) - score(a));
  for (const s of sorted) {
    let body = s.srt ?? s.vtt ?? s.text ?? null;
    if (!body && s.url) {
      try {
        const res = await fetch(s.url);
        if (res.ok) body = await res.text();
      } catch (_e) {
        body = null;
      }
    }
    if (!body) continue;
    const text = parseSrt(body);
    if (text.length > 20) {
      return { text, language: s.language ?? "es" };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Audio download + Whisper
// ---------------------------------------------------------------------------

function pickMediaUrl(platform: Platform, raw: Record<string, unknown>): string | null {
  if (platform === "instagram") {
    return (
      (raw.audioUrl as string | undefined) ??
      (raw.videoUrl as string | undefined) ??
      null
    );
  }
  if (platform === "tiktok") {
    const videoMeta = raw.videoMeta as Record<string, unknown> | undefined;
    return (
      (raw.videoUrl as string | undefined) ??
      (Array.isArray(raw.mediaUrls) && (raw.mediaUrls as string[])[0]) ??
      (videoMeta?.playApi as string | undefined) ??
      (videoMeta?.downloadAddr as string | undefined) ??
      null
    );
  }
  return null;
}

async function downloadMedia(url: string): Promise<{ blob: Blob; mime: string; bytes: number }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download ${res.status} ${url.slice(0, 100)}`);
  const blob = await res.blob();
  const mime = res.headers.get("content-type") ?? "audio/mp4";
  return { blob, mime, bytes: blob.size };
}

async function transcribeWithWhisper(blob: Blob, filename: string): Promise<{ text: string; language: string }> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");
  const fd = new FormData();
  fd.append("file", blob, filename);
  fd.append("model", "whisper-1");
  fd.append("language", "es");
  fd.append("response_format", "verbose_json");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: fd,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Whisper ${res.status}: ${t.slice(0, 500)}`);
  }
  const data = (await res.json()) as { text: string; language?: string };
  return { text: data.text, language: data.language ?? "es" };
}

// ---------------------------------------------------------------------------
// Claude concept extraction
// ---------------------------------------------------------------------------

interface ConceptToolResult {
  hook: string;
  format: string;
  angle: string;
  cta: string;
  summary: string;
  // (M24) strategic classification
  business_objective?: "viralidad" | "nutricion" | "conversion";
  content_objectives?: Array<"educar" | "entretener" | "inspirar">;
  content_type?: string;
  main_topics?: string[];
}

const CONCEPT_TOOL = {
  name: "emit_concept",
  description: "Devolvé el análisis estructurado del video viral.",
  input_schema: {
    type: "object",
    properties: {
      hook: {
        type: "string",
        description: "Cómo abre el video. Primeros 3-5 segundos. Cita textual si existe.",
      },
      format: {
        type: "string",
        description: "Tipo de grabación: talking head, pantalla+rostro, calle, entrevista, voz en off + b-roll, etc.",
      },
      angle: {
        type: "string",
        description: "Ángulo del mensaje: contrarian, didáctico, storytelling, controversia, reacción, etc.",
      },
      cta: {
        type: "string",
        description: "Llamado a la acción explícito o implícito. Si no hay, decir 'sin CTA explícito'.",
      },
      summary: {
        type: "string",
        description: "2-3 párrafos densos en español rioplatense que sinteticen hook + formato + ángulo + CTA + por qué este video performó. Sin filler.",
      },
      business_objective: {
        type: "string",
        enum: ["viralidad", "nutricion", "conversion"],
        description:
          "Objetivo de negocio del video: 'viralidad' (alcanzar nueva audiencia), 'nutricion' (educar sobre quién es y qué vende), 'conversion' (generar una venta directa).",
      },
      content_objectives: {
        type: "array",
        items: { type: "string", enum: ["educar", "entretener", "inspirar"] },
        minItems: 1,
        maxItems: 3,
        description: "Objetivo(s) de contenido. Puede combinar 1, 2 o los 3.",
      },
      content_type: {
        type: "string",
        enum: ["educacional", "lifestyle", "rutina", "otros"],
        description: "Tipo de contenido predominante.",
      },
      main_topics: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        maxItems: 6,
        description: "Temas principales que toca el video (sustantivos cortos, ej: 'ventas', 'mindset', 'n8n').",
      },
    },
    required: [
      "hook",
      "format",
      "angle",
      "cta",
      "summary",
      "business_objective",
      "content_objectives",
      "content_type",
      "main_topics",
    ],
  },
} as const;

const CONCEPT_SYSTEM = `Sos un analista de contenido short-form. Te paso un transcript y metadata de un video viral. Tu tarea: extraer el formato y concepto del video usando la tool emit_concept.

Reglas:
- Español rioplatense, denso, sin filler.
- El "hook" debe ser concreto. Si tenés el transcript, citá los primeros segundos textualmente.
- El "format" describe CÓMO está grabado, no de qué habla.
- El "angle" describe la POSTURA o estrategia narrativa, no el tema.
- El "summary" tiene 2-3 párrafos. Mencioná números de views si son notables.
- Clasificá la estrategia del video:
  · business_objective: viralidad (alcanzar nueva audiencia) / nutricion (educar sobre quién es y qué vende) / conversion (venta directa).
  · content_objectives: educar / entretener / inspirar (1 a 3, las que apliquen).
  · content_type: educacional / lifestyle / rutina / otros.
  · main_topics: los temas concretos que toca (sustantivos cortos).
- Nunca digas "imaginate", "te voy a explicar", "spoiler:", "esto lo cambia todo".`;

async function extractConcept(input: {
  transcript: string;
  platform: Platform;
  caption: string | null;
  title: string | null;
  views: number | null;
}): Promise<ConceptToolResult> {
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

  const userMsg = [
    `Plataforma: ${input.platform}`,
    `Views: ${input.views ?? "n/a"}`,
    input.title ? `Title: ${input.title}` : "",
    input.caption ? `Caption: ${input.caption}` : "",
    "",
    "Transcript:",
    input.transcript.slice(0, 12_000),
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1500,
      system: CONCEPT_SYSTEM,
      tools: [CONCEPT_TOOL],
      tool_choice: { type: "tool", name: "emit_concept" },
      messages: [{ role: "user", content: userMsg }],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Claude ${res.status}: ${t.slice(0, 500)}`);
  }
  const data = (await res.json()) as {
    content: Array<{ type: string; name?: string; input?: ConceptToolResult }>;
  };
  const toolUse = data.content.find((b) => b.type === "tool_use" && b.name === "emit_concept");
  if (!toolUse || !toolUse.input) throw new Error("Claude did not emit concept");
  return decodeUnicodeEscapes(toolUse.input);
}

// ---------------------------------------------------------------------------
// Long-form concept extraction (videos >= LONG_FORM_MIN_SECONDS)
// ---------------------------------------------------------------------------

interface LongFormSection {
  title: string;
  summary: string;
}

interface LongFormToolResult {
  thesis: string;
  structure: LongFormSection[];
  key_arguments: string[];
  offer_or_cta: string;
  retention_tactics: string[];
  summary: string;
  // shared M24 strategic classification (also feeds the strategy report)
  business_objective?: "viralidad" | "nutricion" | "conversion";
  content_objectives?: Array<"educar" | "entretener" | "inspirar">;
  content_type?: string;
  main_topics?: string[];
}

const LONG_FORM_TOOL = {
  name: "emit_long_form_concept",
  description: "Devolvé el análisis estructurado de un video largo (YouTube long-form, charla, podcast).",
  input_schema: {
    type: "object",
    properties: {
      thesis: {
        type: "string",
        description: "La idea o tesis central del video en una o dos frases.",
      },
      structure: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Nombre del bloque/capítulo." },
            summary: { type: "string", description: "Qué pasa en ese bloque en 1-2 frases." },
          },
          required: ["title", "summary"],
        },
        minItems: 2,
        maxItems: 12,
        description: "Los bloques del video EN ORDEN real (apertura → desarrollo → cierre). No inventes capítulos que no estén.",
      },
      key_arguments: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        maxItems: 8,
        description: "Los argumentos, puntos o ideas clave que sostiene el video.",
      },
      offer_or_cta: {
        type: "string",
        description: "Qué ofrece o vende y dónde aparece (mencioná el momento aprox. si se infiere). Si no hay, 'sin oferta explícita'.",
      },
      retention_tactics: {
        type: "array",
        items: { type: "string" },
        minItems: 0,
        maxItems: 6,
        description: "Recursos para sostener la atención: loops, historias, cambios de ritmo, cliffhangers, ejemplos, etc.",
      },
      summary: {
        type: "string",
        description: "2-3 párrafos densos en español rioplatense: de qué va, cómo está construido y por qué funciona. Sin filler.",
      },
      business_objective: {
        type: "string",
        enum: ["viralidad", "nutricion", "conversion"],
        description: "Objetivo de negocio: 'viralidad' (alcanzar nueva audiencia), 'nutricion' (educar sobre quién es y qué vende), 'conversion' (venta directa).",
      },
      content_objectives: {
        type: "array",
        items: { type: "string", enum: ["educar", "entretener", "inspirar"] },
        minItems: 1,
        maxItems: 3,
        description: "Objetivo(s) de contenido. Puede combinar 1, 2 o los 3.",
      },
      content_type: {
        type: "string",
        enum: ["educacional", "lifestyle", "rutina", "otros"],
        description: "Tipo de contenido predominante.",
      },
      main_topics: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        maxItems: 6,
        description: "Temas principales (sustantivos cortos, ej: 'ventas', 'mindset', 'n8n').",
      },
    },
    required: [
      "thesis",
      "structure",
      "key_arguments",
      "offer_or_cta",
      "retention_tactics",
      "summary",
      "business_objective",
      "content_objectives",
      "content_type",
      "main_topics",
    ],
  },
} as const;

const LONG_FORM_SYSTEM = `Sos un analista de contenido de video LARGO (YouTube long-form, charlas, podcasts). Te paso el transcript y metadata de un video de un referente. Tu tarea: extraer la estructura y la estrategia usando la tool emit_long_form_concept.

Reglas:
- Español rioplatense, denso, sin filler.
- "thesis": la idea central, no un resumen genérico.
- "structure": reflejá el ORDEN real del video (apertura → desarrollo → cierre). No inventes capítulos. Si el transcript viene cortado (verás un marcador [...]), inferí el cierre desde la parte final.
- "key_arguments": los puntos que el creador defiende o demuestra.
- "offer_or_cta": clave. Identificá si vende/ofrece algo (curso, comunidad, lead magnet, suscripción) y dónde cae. Si no hay, 'sin oferta explícita'.
- "retention_tactics": cómo sostiene la atención a lo largo de un video largo.
- Clasificá igual que short-form: business_objective / content_objectives / content_type / main_topics.
- Nunca uses "imaginate", "te voy a explicar", "spoiler:", "esto lo cambia todo".`;

async function extractLongFormConcept(input: {
  transcript: string;
  caption: string | null;
  title: string | null;
  views: number | null;
}): Promise<LongFormToolResult> {
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

  const userMsg = [
    `Plataforma: youtube (video largo)`,
    `Views: ${input.views ?? "n/a"}`,
    input.title ? `Title: ${input.title}` : "",
    input.caption ? `Caption: ${input.caption}` : "",
    "",
    "Transcript:",
    clipTranscriptForLong(input.transcript, LONG_TRANSCRIPT_CAP),
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 2500,
      system: LONG_FORM_SYSTEM,
      tools: [LONG_FORM_TOOL],
      tool_choice: { type: "tool", name: "emit_long_form_concept" },
      messages: [{ role: "user", content: userMsg }],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Claude ${res.status}: ${t.slice(0, 500)}`);
  }
  const data = (await res.json()) as {
    content: Array<{ type: string; name?: string; input?: LongFormToolResult }>;
  };
  const toolUse = data.content.find(
    (b) => b.type === "tool_use" && b.name === "emit_long_form_concept",
  );
  if (!toolUse || !toolUse.input) throw new Error("Claude did not emit long-form concept");
  return decodeUnicodeEscapes(toolUse.input);
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function setStatus(
  client: SupabaseClient,
  id: string,
  fields: Partial<{
    transcript: string | null;
    transcript_language: string | null;
    transcript_status: string;
    transcript_error: string | null;
    concept_summary: string | null;
    concept_status: string;
    concept_error: string | null;
    business_objective: string | null;
    content_objectives: string[] | null;
    content_type: string | null;
    main_topics: string[] | null;
    long_form_breakdown: Record<string, unknown> | null;
  }>,
) {
  const { error } = await client.from("referent_videos").update(fields).eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let videoId: string | null = null;
  let userClient: SupabaseClient | null = null;

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const apiKey = req.headers.get("apikey") ?? "";
    const isServiceRole =
      authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` ||
      apiKey === SUPABASE_SERVICE_ROLE_KEY;

    if (isServiceRole) {
      userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    } else {
      if (!authHeader) return json({ error: "Missing Authorization" }, 401);
      userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userErr } = await userClient.auth.getUser();
      if (userErr || !user) return json({ error: "Unauthenticated" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    videoId = typeof body?.referent_video_id === "string" ? body.referent_video_id : null;
    const force = !!body?.force;
    if (!videoId) return json({ error: "referent_video_id is required" }, 400);

    const { data: video, error: vErr } = await userClient
      .from("referent_videos")
      .select(
        "id, referent_id, platform, source_url, title, caption, views_total, video_duration, raw, transcript, transcript_status, concept_status, concept_summary, long_form_breakdown",
      )
      .eq("id", videoId)
      .single<ReferentVideoRow>();
    if (vErr || !video) return json({ error: vErr?.message ?? "Not found" }, 404);

    // Long videos (>= 3 min) get the structure-oriented analysis; short clips
    // keep the hook/format/angle concept.
    const isLongForm = (video.video_duration ?? 0) >= LONG_FORM_MIN_SECONDS;

    // Cache hit only if fully analyzed AND, for a long video, the long-form
    // breakdown is present. This re-analyzes long videos that were processed
    // under the old short-form path (pre-M32) without forcing a re-transcribe
    // (the transcript is reused below).
    if (
      !force &&
      video.transcript_status === "done" &&
      video.concept_status === "done" &&
      video.transcript &&
      video.concept_summary &&
      (!isLongForm || video.long_form_breakdown)
    ) {
      return json({
        ok: true,
        cached: true,
        transcript_status: "done",
        concept_status: "done",
      });
    }

    // ---- Transcript ----
    let transcript = video.transcript ?? null;
    let transcriptLanguage: string | null = null;
    // Only (re)transcribe when there's no transcript yet or force is set. When we
    // reuse an existing transcript (e.g. re-analyzing a pre-M32 long video to fill
    // its breakdown), leave transcript_status as-is so it doesn't get stuck pending.
    const willTranscribe = !transcript || force;

    await setStatus(userClient, video.id, {
      ...(willTranscribe ? { transcript_status: "pending", transcript_error: null } : {}),
      concept_status: "pending",
      concept_error: null,
    });

    if (willTranscribe) {
      if (!video.raw) {
        await setStatus(userClient, video.id, {
          transcript_status: "failed",
          transcript_error: "Sin raw del scrape. Refrescá los virales antes de analizar.",
          concept_status: "idle",
        });
        return json({ error: "missing raw — re-scrape first" }, 422);
      }

      if (video.platform === "youtube") {
        const yt = await ytSubtitlesToText(video.raw);
        if (yt) {
          transcript = yt.text;
          transcriptLanguage = yt.language;
        }
      }

      if (!transcript) {
        const mediaUrl = pickMediaUrl(video.platform, video.raw);
        if (!mediaUrl) {
          await setStatus(userClient, video.id, {
            transcript_status: "failed",
            transcript_error:
              "Sin URL de audio/video disponible en el raw. Re-scrapeá el referente para refrescar.",
            concept_status: "idle",
          });
          return json({ error: "no media url" }, 422);
        }
        const { blob, mime, bytes } = await downloadMedia(mediaUrl);
        if (bytes > WHISPER_MAX_BYTES) {
          await setStatus(userClient, video.id, {
            transcript_status: "failed",
            transcript_error: `Archivo demasiado grande para Whisper (${(bytes / 1024 / 1024).toFixed(1)}MB > 25MB)`,
            concept_status: "idle",
          });
          return json({ error: "media too large" }, 422);
        }
        const ext = mime.includes("audio") ? "mp4" : "mp4";
        const result = await transcribeWithWhisper(blob, `referent-${video.id}.${ext}`);
        transcript = result.text;
        transcriptLanguage = result.language;
      }

      await setStatus(userClient, video.id, {
        transcript,
        transcript_language: transcriptLanguage,
        transcript_status: "done",
        transcript_error: null,
      });
    }

    if (!transcript || transcript.trim().length < 10) {
      await setStatus(userClient, video.id, {
        concept_status: "failed",
        concept_error: "Transcript vacío, no se puede extraer concepto.",
      });
      return json({ error: "empty transcript" }, 422);
    }

    // ---- Concept ----
    // Both paths populate concept_summary + the M24 classification so the
    // strategy report works unchanged; the long path also fills long_form_breakdown.
    let conceptSummary: string;
    let classification: {
      business_objective?: string;
      content_objectives?: string[];
      content_type?: string;
      main_topics?: string[];
    };
    let longFormBreakdown: Record<string, unknown> | null = null;

    if (isLongForm) {
      const lf = await extractLongFormConcept({
        transcript,
        caption: video.caption,
        title: video.title,
        views: video.views_total,
      });
      conceptSummary = lf.summary;
      classification = lf;
      longFormBreakdown = {
        thesis: lf.thesis,
        structure: lf.structure,
        key_arguments: lf.key_arguments,
        offer_or_cta: lf.offer_or_cta,
        retention_tactics: lf.retention_tactics,
      };
    } else {
      const concept = await extractConcept({
        transcript,
        platform: video.platform,
        caption: video.caption,
        title: video.title,
        views: video.views_total,
      });
      conceptSummary = concept.summary;
      classification = concept;
    }

    await setStatus(userClient, video.id, {
      concept_summary: conceptSummary,
      concept_status: "done",
      concept_error: null,
      business_objective: classification.business_objective ?? null,
      content_objectives: classification.content_objectives ?? null,
      content_type: classification.content_type ?? null,
      main_topics: classification.main_topics ?? null,
      long_form_breakdown: longFormBreakdown,
    });

    return json({
      ok: true,
      cached: false,
      transcript_status: "done",
      concept_status: "done",
      long_form: isLongForm,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (videoId && userClient) {
      // Best-effort: marca el campo que probablemente esté en pending como failed
      try {
        await userClient
          .from("referent_videos")
          .update({
            transcript_status: "failed",
            transcript_error: msg,
            concept_status: "failed",
            concept_error: msg,
          })
          .eq("id", videoId)
          .or("transcript_status.eq.pending,concept_status.eq.pending");
      } catch (_e) {
        // ignore
      }
    }
    return json({ error: msg }, 500);
  }
});
