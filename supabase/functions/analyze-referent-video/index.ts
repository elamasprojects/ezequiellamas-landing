// analyze-referent-video — toma un referent_videos row y le saca:
//   1) transcript (YT subtitles si hay, si no Whisper sobre audio del raw)
//   2) concept_summary (Claude tool_use con hook/format/angle/cta)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const CLAUDE_MODEL = "claude-sonnet-4-6";
const WHISPER_MAX_BYTES = 25 * 1024 * 1024;

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

type Platform = "instagram" | "youtube" | "tiktok" | "other";

interface ReferentVideoRow {
  id: string;
  referent_id: string;
  platform: Platform;
  source_url: string;
  title: string | null;
  caption: string | null;
  views_total: number | null;
  raw: Record<string, unknown> | null;
  transcript: string | null;
  transcript_status: string;
  concept_status: string;
  concept_summary: string | null;
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
    },
    required: ["hook", "format", "angle", "cta", "summary"],
  },
} as const;

const CONCEPT_SYSTEM = `Sos un analista de contenido short-form. Te paso un transcript y metadata de un video viral. Tu tarea: extraer el formato y concepto del video usando la tool emit_concept.

Reglas:
- Español rioplatense, denso, sin filler.
- El "hook" debe ser concreto. Si tenés el transcript, citá los primeros segundos textualmente.
- El "format" describe CÓMO está grabado, no de qué habla.
- El "angle" describe la POSTURA o estrategia narrativa, no el tema.
- El "summary" tiene 2-3 párrafos. Mencioná números de views si son notables.
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
  return toolUse.input;
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization" }, 401);

    userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    videoId = typeof body?.referent_video_id === "string" ? body.referent_video_id : null;
    const force = !!body?.force;
    if (!videoId) return json({ error: "referent_video_id is required" }, 400);

    const { data: video, error: vErr } = await userClient
      .from("referent_videos")
      .select(
        "id, referent_id, platform, source_url, title, caption, views_total, raw, transcript, transcript_status, concept_status, concept_summary",
      )
      .eq("id", videoId)
      .single<ReferentVideoRow>();
    if (vErr || !video) return json({ error: vErr?.message ?? "Not found" }, 404);

    if (
      !force &&
      video.transcript_status === "done" &&
      video.concept_status === "done" &&
      video.transcript &&
      video.concept_summary
    ) {
      return json({
        ok: true,
        cached: true,
        transcript_status: "done",
        concept_status: "done",
      });
    }

    await setStatus(userClient, video.id, {
      transcript_status: "pending",
      transcript_error: null,
      concept_status: "pending",
      concept_error: null,
    });

    // ---- Transcript ----
    let transcript = video.transcript ?? null;
    let transcriptLanguage: string | null = null;

    if (!transcript || force) {
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
    const concept = await extractConcept({
      transcript,
      platform: video.platform,
      caption: video.caption,
      title: video.title,
      views: video.views_total,
    });

    await setStatus(userClient, video.id, {
      concept_summary: concept.summary,
      concept_status: "done",
      concept_error: null,
    });

    return json({
      ok: true,
      cached: false,
      transcript_status: "done",
      concept_status: "done",
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
