// analyze-youtube-video — (M25) for an own-channel youtube_videos row: extract a
// transcript (Apify YT subtitles) and a concept + strategic classification via
// Claude (same shape as analyze-referent-video / M24). Caches on the row.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const APIFY_TOKEN = Deno.env.get("APIFY_API_KEY") ?? Deno.env.get("APIFY_API_KEY_YOUTUBE");

const CLAUDE_MODEL = "claude-sonnet-4-6";

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

function decodeUnicodeEscapes<T>(value: T): T {
  if (typeof value === "string") {
    return value
      .replace(
        /\\u([dD][89aAbB][0-9a-fA-F]{2})\\u([dD][c-fC-F][0-9a-fA-F]{2})/g,
        (_m, hi, lo) => String.fromCharCode(parseInt(hi, 16), parseInt(lo, 16)),
      )
      .replace(/\\u([0-9a-fA-F]{4})/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16))) as T;
  }
  if (Array.isArray(value)) return value.map((v) => decodeUnicodeEscapes(v)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = decodeUnicodeEscapes(v);
    return out as T;
  }
  return value;
}

// SRT/VTT → plain text.
function parseSrt(text: string): string {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .filter((l) =>
      l.trim() &&
      !/^\d+$/.test(l.trim()) &&
      !/^\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->/.test(l) &&
      !/^WEBVTT/.test(l)
    )
    .join(" ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

interface YtSubtitle { language?: string; url?: string; srt?: string; type?: string }

async function fetchTranscript(videoId: string): Promise<{ text: string; language: string } | null> {
  if (!APIFY_TOKEN) throw new Error("APIFY_API_KEY no configurado");
  const url = `https://api.apify.com/v2/acts/streamers~youtube-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      startUrls: [{ url: `https://www.youtube.com/watch?v=${videoId}` }],
      maxResults: 1,
      subtitles: true,
    }),
  });
  if (!res.ok) throw new Error(`Apify ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const items = (await res.json()) as Array<Record<string, unknown>>;
  const raw = items[0];
  if (!raw) return null;
  const subs = (raw.subtitles ?? raw.captions ?? []) as YtSubtitle[];
  if (!Array.isArray(subs) || subs.length === 0) return null;
  const score = (s: YtSubtitle) => {
    const lang = (s.language ?? "").toLowerCase();
    if (lang.includes("es") && lang.includes("auto")) return 4;
    if (lang.includes("es")) return 3;
    if (lang.includes("auto")) return 2;
    return 1;
  };
  const best = [...subs].sort((a, b) => score(b) - score(a))[0];
  let srt = best.srt ?? "";
  if (!srt && best.url) {
    const r = await fetch(best.url);
    if (r.ok) srt = await r.text();
  }
  const text = parseSrt(srt);
  if (!text) return null;
  return { text, language: best.language ?? "es" };
}

interface ConceptResult {
  hook: string;
  format: string;
  angle: string;
  cta: string;
  summary: string;
  business_objective?: string;
  content_objectives?: string[];
  content_type?: string;
  main_topics?: string[];
}

const CONCEPT_TOOL = {
  name: "emit_concept",
  description: "Devolvé el análisis estructurado del video.",
  input_schema: {
    type: "object",
    properties: {
      hook: { type: "string", description: "Cómo abre el video. Primeros segundos. Cita textual si existe." },
      format: { type: "string", description: "Tipo de grabación/edición (talking head, pantalla+rostro, tutorial, etc.)." },
      angle: { type: "string", description: "Ángulo o postura narrativa." },
      cta: { type: "string", description: "CTA explícito o implícito; 'sin CTA explícito' si no hay." },
      summary: { type: "string", description: "2-3 párrafos densos en español rioplatense. Sin filler." },
      business_objective: { type: "string", enum: ["viralidad", "nutricion", "conversion"] },
      content_objectives: { type: "array", items: { type: "string", enum: ["educar", "entretener", "inspirar"] }, minItems: 1, maxItems: 3 },
      content_type: { type: "string", enum: ["educacional", "lifestyle", "rutina", "otros"] },
      main_topics: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 6 },
    },
    required: ["hook", "format", "angle", "cta", "summary", "business_objective", "content_objectives", "content_type", "main_topics"],
  },
} as const;

const CONCEPT_SYSTEM =
  `Sos un analista de contenido de YouTube. Te paso el transcript y metadata de un video largo. Extraé su concepto y estrategia con la tool emit_concept. ` +
  `Español rioplatense, denso, sin filler. El "format" describe CÓMO está grabado; el "angle" la postura narrativa. ` +
  `Clasificá: business_objective (viralidad/nutricion/conversion), content_objectives (educar/entretener/inspirar), content_type, main_topics. ` +
  `Nunca digas "imaginate", "te voy a explicar", "spoiler:", "esto lo cambia todo".`;

async function extractConcept(input: { transcript: string; title: string | null; views: number | null }): Promise<ConceptResult> {
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY no configurado");
  const userMsg = [
    input.title ? `Título: ${input.title}` : "",
    `Views: ${input.views ?? "n/a"}`,
    "",
    "Transcript:",
    input.transcript.slice(0, 14_000),
  ].filter(Boolean).join("\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1500,
      system: CONCEPT_SYSTEM,
      tools: [CONCEPT_TOOL],
      tool_choice: { type: "tool", name: "emit_concept" },
      messages: [{ role: "user", content: userMsg }],
    }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const data = (await res.json()) as { content: Array<{ type: string; name?: string; input?: ConceptResult }> };
  const toolUse = data.content.find((b) => b.type === "tool_use" && b.name === "emit_concept");
  if (!toolUse?.input) throw new Error("Claude no devolvió el concepto");
  return decodeUnicodeEscapes(toolUse.input);
}

async function setStatus(client: SupabaseClient, id: string, fields: Record<string, unknown>) {
  const { error } = await client.from("youtube_videos").update(fields).eq("id", id);
  if (error) throw error;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let rowId: string | null = null;
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
    rowId = typeof body?.youtube_video_row_id === "string" ? body.youtube_video_row_id : null;
    const force = !!body?.force;
    if (!rowId) return json({ error: "youtube_video_row_id is required" }, 400);

    const { data: video, error: vErr } = await userClient
      .from("youtube_videos")
      .select("id, youtube_video_id, title, view_count, transcript, transcript_status, concept_status, concept_summary")
      .eq("id", rowId)
      .single();
    if (vErr || !video) return json({ error: vErr?.message ?? "Not found" }, 404);

    if (!force && video.transcript_status === "done" && video.concept_status === "done" && video.concept_summary) {
      return json({ ok: true, cached: true, transcript_status: "done", concept_status: "done" });
    }

    await setStatus(userClient, video.id, {
      transcript_status: "pending",
      transcript_error: null,
      concept_status: "pending",
      concept_error: null,
    });

    // Transcript (best-effort via Apify subtitles).
    let transcript = video.transcript ?? "";
    let language: string | null = null;
    if (!transcript || force) {
      try {
        const t = await fetchTranscript(video.youtube_video_id);
        if (!t) {
          await setStatus(userClient, video.id, {
            transcript_status: "unavailable",
            transcript_error: "Sin subtítulos disponibles para este video.",
            concept_status: "failed",
            concept_error: "Sin transcript.",
          });
          return json({ ok: false, transcript_status: "unavailable" }, 200);
        }
        transcript = t.text;
        language = t.language;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await setStatus(userClient, video.id, { transcript_status: "failed", transcript_error: msg.slice(0, 400), concept_status: "failed" });
        return json({ error: msg }, 502);
      }
    }
    await setStatus(userClient, video.id, {
      transcript,
      transcript_language: language,
      transcript_status: "done",
      transcript_error: null,
    });

    // Concept + classification.
    const concept = await extractConcept({ transcript, title: video.title, views: video.view_count });
    await setStatus(userClient, video.id, {
      concept_summary: concept.summary,
      concept_status: "done",
      concept_error: null,
      business_objective: concept.business_objective ?? null,
      content_objectives: concept.content_objectives ?? null,
      content_type: concept.content_type ?? null,
      main_topics: concept.main_topics ?? null,
    });

    return json({ ok: true, cached: false, transcript_status: "done", concept_status: "done" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (rowId && userClient) {
      try {
        await userClient.from("youtube_videos").update({ concept_status: "failed", concept_error: msg.slice(0, 400) }).eq("id", rowId);
      } catch { /* ignore */ }
    }
    return json({ error: msg }, 500);
  }
});
