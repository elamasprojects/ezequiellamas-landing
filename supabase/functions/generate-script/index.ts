// generate-script — orquestador
// Flujo: audio (Whisper) + text → Claude Sonnet 4.6 con manifesto+rules+banco
// → submit_script tool → validación AI-tells → retry correctivo si hace falta
// → create_script_with_brolls RPC.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { SUBMIT_SCRIPT_TOOL, SYSTEM_PROMPT } from "./prompt.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const CLAUDE_MODEL = "claude-sonnet-4-6";
const CLAUDE_MAX_TOKENS = 4000;

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

// ---------------------------------------------------------------------------
// Whisper transcription
// ---------------------------------------------------------------------------

async function transcribeWithWhisper(blob: Blob, filename: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", blob, filename);
  formData.append("model", "whisper-1");
  formData.append("language", "es");
  formData.append("response_format", "json");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: formData,
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Whisper API ${res.status}: ${errText.slice(0, 500)}`);
  }
  const data = (await res.json()) as { text: string };
  return data.text;
}

// ---------------------------------------------------------------------------
// Claude tool result
// ---------------------------------------------------------------------------

interface BrollItem {
  position: number;
  cue_text?: string;
  suggestion: string;
}

interface ClaudeToolResult {
  title: string;
  hook: string;
  hook_alternatives: string[];
  hook_reference: string;
  visual_hook_format?: number;
  development: string;
  cta: string;
  on_screen_text: string;
  caption: string;
  hashtags: string[];
  seo_keywords: string[];
  brolls: BrollItem[];
  why_it_works: string;
  content_bucket: "negocios" | "sistemas" | "ia_estrategica" | "finanzas" | "mentalidad";
  avatar_target: "newbie" | "owner" | "developer";
  mental_model: "first_principles" | "inversion" | "reverse_engineering" | "none";
  platform_codes: string[];
  storytelling: { setup: string; conflict: string; resolution: string };
  tone: string;
  estimated_wpm: number;
  ai_summary: string;
}

// ---------------------------------------------------------------------------
// AI-tell detector
// ---------------------------------------------------------------------------

const AI_TELLS: Array<{ name: string; pattern: RegExp }> = [
  { name: "antitesis 'no es X es Y'", pattern: /\bno es\s+[^.]{1,60}\s+,?\s*es\b/i },
  { name: "'esto lo cambia todo'", pattern: /\besto lo cambia todo\b/i },
  { name: "'nunca antes visto'", pattern: /\bnunca antes visto\b/i },
  { name: "'el secreto que nadie te cuenta/cambió mi vida'", pattern: /\bel secreto que (nadie te cuenta|cambi[óo] mi vida)\b/i },
  { name: "'spoiler:' muletilla", pattern: /\bspoiler\s*:/i },
  { name: "'imaginate/pensá esto' apertura vacía", pattern: /^(\s*)?(imagin[áa]te|pens[áa] esto)\b/im },
  { name: "'te voy a explicar' warmup", pattern: /\bte voy a explicar\b/i },
  { name: "'la realidad/verdad es que' filler", pattern: /\bla (realidad|verdad) es que\b/i },
  { name: "cierre 'X. Punto.'", pattern: /\.\s*Punto\.?(\s|$)/ },
  { name: "'literalmente' filler", pattern: /\bliteralmente\b/i },
  { name: "'básicamente' filler", pattern: /\bb[áa]sicamente\b/i },
  { name: "em-dash dramático", pattern: /—/ },
  { name: "'guardá este post' muletilla", pattern: /\bguard[áa] este post\b/i },
  { name: "'En este post te voy a enseñar'", pattern: /\ben este post te voy a ense[ñn]ar\b/i },
  { name: "emojis decorativos", pattern: /[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/u },
];

function detectAiTells(text: string): string[] {
  const flagged: string[] = [];
  for (const t of AI_TELLS) {
    if (t.pattern.test(text)) flagged.push(t.name);
  }
  return flagged;
}

function combinedTextOf(r: ClaudeToolResult): string {
  return [
    r.title,
    r.hook,
    ...(r.hook_alternatives ?? []),
    r.development,
    r.cta,
    r.on_screen_text,
    r.caption,
    r.why_it_works,
    r.storytelling?.setup ?? "",
    r.storytelling?.conflict ?? "",
    r.storytelling?.resolution ?? "",
  ].join("\n");
}

function validateResult(r: ClaudeToolResult): { ok: true } | { ok: false; reasons: string[] } {
  const reasons: string[] = [];

  if (!r.hashtags || r.hashtags.length < 3 || r.hashtags.length > 7) {
    reasons.push(`hashtags fuera de rango (${r.hashtags?.length ?? 0}; pedimos 3-7)`);
  }
  if (
    r.visual_hook_format !== undefined &&
    r.visual_hook_format !== null &&
    (r.visual_hook_format < 1 || r.visual_hook_format > 24)
  ) {
    reasons.push(`visual_hook_format fuera de rango (${r.visual_hook_format}; debe ser 1-24)`);
  }
  if (!r.platform_codes || r.platform_codes.length < 2) {
    reasons.push(`platform_codes insuficientes (${r.platform_codes?.length ?? 0}; mínimo 2)`);
  }

  const tells = detectAiTells(combinedTextOf(r));
  if (tells.length > 0) {
    reasons.push(`AI-tells detectados: ${tells.join(", ")}`);
  }

  return reasons.length === 0 ? { ok: true } : { ok: false, reasons };
}

// ---------------------------------------------------------------------------
// Claude call (with prompt caching + optional retry messages)
// ---------------------------------------------------------------------------

interface ClaudeMessage {
  role: "user" | "assistant";
  content:
    | string
    | Array<{ type: "text"; text: string } | { type: "tool_use"; id: string; name: string; input: unknown } | { type: "tool_result"; tool_use_id: string; content: string }>;
}

interface ClaudeUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

async function callClaude(
  messages: ClaudeMessage[],
): Promise<{ result: ClaudeToolResult; usage: ClaudeUsage }> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: CLAUDE_MAX_TOKENS,
      // System como bloques cacheables (los inputs estáticos del prompt)
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages,
      tools: [SUBMIT_SCRIPT_TOOL],
      tool_choice: { type: "tool", name: "submit_script" },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API ${res.status}: ${errText.slice(0, 800)}`);
  }
  const data = (await res.json()) as {
    content: Array<{ type: string; id?: string; name?: string; input?: ClaudeToolResult }>;
    usage?: ClaudeUsage;
    stop_reason?: string;
  };
  const toolBlock = (data.content ?? []).find(
    (b) => b.type === "tool_use" && b.name === "submit_script",
  );
  if (!toolBlock?.input) {
    throw new Error("Claude did not return a submit_script tool_use block");
  }
  return { result: decodeUnicodeEscapes(toolBlock.input), usage: data.usage ?? {} };
}

// ---------------------------------------------------------------------------
// User prompt builder
// ---------------------------------------------------------------------------

interface FewShotScript {
  title: string | null;
  hook: string | null;
  development: string | null;
  cta: string | null;
  tone: string | null;
  content_bucket: string | null;
  avatar_target: string | null;
  hook_reference: string | null;
  mental_model: string | null;
}

interface ReferenceBlockInput {
  platform: string;
  source_url: string;
  title: string | null;
  caption: string | null;
  transcript: string;
  mode: "structure_only" | "content_adapt";
  hasUserConcept: boolean;
  // Solo cuando la fuente es `referent_videos` (banco de virales analizados).
  // El análisis IA de por qué el video performó (hook, formato, ángulo, CTA, summary).
  conceptSummary?: string | null;
  // Nombre del referente (creator original), si está disponible.
  referentName?: string | null;
  // Métricas del video, si están disponibles (helps Claude calibrate por qué funcionó).
  views?: number | null;
}

function buildReferenceBlock(ref: ReferenceBlockInput): string {
  const transcript = (ref.transcript ?? "").slice(0, 8000);
  const conceptSummary = (ref.conceptSummary ?? "").slice(0, 4000);
  const modeInstructions = ref.mode === "content_adapt"
    ? [
        "MODO: Adaptación de contenido.",
        "- El video referencia es el punto de partida del CONTENIDO. Adaptá tema, ejemplos y estructura a tu voz.",
        "- Usá el HOOK del video como inspiración directa: el formato del hook (tipo de apertura, gancho, gatillo emocional) debe ser análogo, pero re-escrito para tu avatar y realidad.",
        ref.hasUserConcept
          ? "- El texto/audio del usuario son AJUSTES sobre ese contenido (qué enfatizar, qué cambiar, qué agregar)."
          : "- No hay concepto del usuario: traducí el video entero a la voz de Ezequiel (Argentina, dev, agencia UGC, IA). El TEMA puede ser similar pero la voz, ejemplos y POV son 100% Ezequiel.",
        "- NUNCA copiar frases literales de la transcripción.",
      ].join("\n")
    : [
        "MODO: Estructura solamente.",
        "- El concepto del usuario MANDA. La referencia es solo andamiaje estructural.",
        "- Tomá del video referencia: la lógica del hook (qué tipo de apertura usa) y la arquitectura narrativa (cómo desarrolla, cómo cierra).",
        "- NO uses el contenido, ejemplos ni tema del video referencia. Solo su forma.",
      ].join("\n");

  return [
    "=== REFERENCIA INSPIRACIONAL ===",
    `Plataforma: ${ref.platform}`,
    `URL: ${ref.source_url}`,
    ref.referentName ? `Creator original: ${ref.referentName}` : "",
    ref.views != null ? `Views: ${ref.views.toLocaleString("es-AR")}` : "",
    ref.title ? `Título: ${ref.title}` : "",
    ref.caption ? `Caption: ${ref.caption}` : "",
    "",
    "Transcript del video:",
    `"""\n${transcript}\n"""`,
    conceptSummary
      ? [
          "",
          "ANÁLISIS PREVIO DE POR QUÉ ESTE VIDEO PERFORMÓ (úsalo como pista, no copies):",
          `"""\n${conceptSummary}\n"""`,
        ].join("\n")
      : "",
    "",
    "INSTRUCCIONES SOBRE LA REFERENCIA:",
    modeInstructions,
    "- Mantené siempre el MANIFIESTO + REGLAS DE SCRIPTING + BANCO DE HOOKS.",
    "- Si el video referencia no es argentino, traducí el tono al rioplatense casual técnico.",
  ].filter(Boolean).join("\n");
}

interface SeriesPriorScript {
  part_number: number | null;
  title: string | null;
  hook: string | null;
  ai_summary: string | null;
}

function buildUserPrompt(args: {
  concept: string;
  formatName?: string;
  formatDescription?: string;
  shapeName?: string;
  shapeDescription?: string;
  seriesName?: string;
  seriesDescription?: string;
  partNumber?: number | null;
  seriesPriorScripts?: SeriesPriorScript[];
  fewShotScripts: FewShotScript[];
  referenceBlock?: string;
}): string {
  const formatLine = args.formatName
    ? `=== FORMATO ELEGIDO ===\n${args.formatName}: ${args.formatDescription ?? ""}`
    : "=== FORMATO ===\n(la IA elige el más apropiado)";

  const shapeLine = args.shapeName
    ? `=== SHAPE (estructura narrativa) ===\n${args.shapeName}: ${args.shapeDescription ?? ""}\n\nIMPORTANTE: Respetá los beats que define el shape. El hook, el desarrollo y el CTA deben seguir esa estructura, no improvisar otra.`
    : "";

  const seriesBlock = args.seriesName
    ? [
        "=== SERIE ===",
        `${args.seriesName}: ${args.seriesDescription ?? ""}`,
        args.partNumber ? `Este guion es la parte ${args.partNumber} de la serie.` : "",
        args.seriesPriorScripts && args.seriesPriorScripts.length > 0
          ? [
              "",
              "Ya están cubiertos en partes anteriores de la serie (NO los repitas, asumí que el espectador los conoce o son distintos):",
              ...args.seriesPriorScripts.map((s) => {
                const pn = s.part_number ? `Parte ${s.part_number}: ` : "- ";
                return `${pn}${s.title ?? "(sin título)"} — ${s.ai_summary ?? s.hook ?? ""}`.slice(0, 300);
              }),
            ].join("\n")
          : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  const fewShotBlock =
    args.fewShotScripts.length === 0
      ? "=== EJEMPLOS DE GUIONES ANTERIORES (few-shot) ===\n(ninguno todavía — aplicá el manifiesto y las reglas tal como están)"
      : `=== EJEMPLOS DE GUIONES ANTERIORES (few-shot, los últimos publicados/grabados/agendados) ===\n${args.fewShotScripts
          .map((s, i) => {
            const meta: string[] = [];
            if (s.content_bucket) meta.push(`bucket=${s.content_bucket}`);
            if (s.avatar_target) meta.push(`avatar=${s.avatar_target}`);
            if (s.hook_reference) meta.push(`hook_ref=${s.hook_reference}`);
            if (s.mental_model && s.mental_model !== "none") meta.push(`modelo=${s.mental_model}`);
            const metaLine = meta.length ? `Meta: ${meta.join(" · ")}\n` : "";
            return `--- Ejemplo ${i + 1} ---\n${metaLine}Título: ${s.title ?? "(sin título)"}\nHook: ${s.hook ?? ""}\nDevelopment: ${s.development ?? ""}\nCTA: ${s.cta ?? ""}\nTono: ${s.tone ?? ""}`;
          })
          .join("\n\n")}`;

  const conceptBlock = args.concept.trim().length > 0
    ? `=== CONCEPTO DEL USUARIO ===\n${args.concept.trim()}`
    : "=== CONCEPTO DEL USUARIO ===\n(el usuario no aportó concepto propio — usá la referencia inspiracional como contenido base, adaptado a su voz)";

  return [
    conceptBlock,
    args.referenceBlock ?? "",
    formatLine,
    shapeLine,
    seriesBlock,
    fewShotBlock,
    `=== INSTRUCCIONES ===\nGenerá el guion completo en la voz de Ezequiel. Aplicá el manifiesto + las reglas + el banco de hooks${args.shapeName ? " + el shape elegido" : ""}${args.seriesName ? " + el contexto de la serie" : ""}. Llamá a la tool submit_script con el resultado estructurado. UNA SOLA invocación.`,
  ].filter(Boolean).join("\n\n");
}

function buildRetryUserMessage(reasons: string[]): string {
  return [
    "El guion anterior NO pasó la validación de marca por estos motivos:",
    ...reasons.map((r) => `- ${r}`),
    "",
    "Reescribí el guion entero evitando todos esos problemas. Mismas restricciones de marca: voz argentina técnica, sin AI-tells, hashtags 3-7 específicos, mínimo 2 platform_codes, hook con hook_reference del banco.",
    "Llamá a submit_script de nuevo con la versión corregida.",
  ].join("\n");
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function sanitizeHashtag(tag: string): string {
  return tag
    .replace(/^#+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñ]/g, "");
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

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
    const audio_upload_id = typeof body?.audio_upload_id === "string" ? body.audio_upload_id : null;
    const raw_concept_input = typeof body?.raw_concept === "string" ? body.raw_concept.trim() : "";
    const format_id = typeof body?.format_id === "string" ? body.format_id : null;
    const shape_id = typeof body?.shape_id === "string" ? body.shape_id : null;
    const series_id = typeof body?.series_id === "string" ? body.series_id : null;
    const part_number = typeof body?.part_number === "number" && Number.isInteger(body.part_number)
      ? body.part_number
      : null;
    const idea_reference_id = typeof body?.idea_reference_id === "string" ? body.idea_reference_id : null;
    const referent_video_id = typeof body?.referent_video_id === "string" ? body.referent_video_id : null;
    const target_script_id = typeof body?.target_script_id === "string" ? body.target_script_id : null;
    const reference_mode_input =
      body?.reference_mode === "structure_only" || body?.reference_mode === "content_adapt"
        ? (body.reference_mode as "structure_only" | "content_adapt")
        : null;

    // Si es regeneración in-place (target_script_id) y no llegó concept, fallback al
    // raw_concept del script existente.
    let regenerationFallbackConcept: string | null = null;
    let regenerationFallback = {
      format_id: null as string | null,
      shape_id: null as string | null,
      series_id: null as string | null,
      part_number: null as number | null,
    };
    if (target_script_id) {
      const { data: existingScript, error: existingErr } = await userClient
        .from("scripts")
        .select("id, owner_id, raw_concept, format_id, shape_id, series_id, part_number")
        .eq("id", target_script_id)
        .maybeSingle();
      if (existingErr || !existingScript) {
        return json({ error: existingErr?.message ?? "target_script_id not found or not owned" }, 404);
      }
      regenerationFallbackConcept = existingScript.raw_concept ?? null;
      regenerationFallback = {
        format_id: existingScript.format_id ?? null,
        shape_id: existingScript.shape_id ?? null,
        series_id: existingScript.series_id ?? null,
        part_number: existingScript.part_number ?? null,
      };
    }

    if (
      !audio_upload_id &&
      !raw_concept_input &&
      !idea_reference_id &&
      !referent_video_id &&
      !regenerationFallbackConcept
    ) {
      return json(
        { error: "audio_upload_id, raw_concept, idea_reference_id or referent_video_id required" },
        400,
      );
    }

    // -- Audio → transcript ---------------------------------------------------
    let transcript = "";
    if (audio_upload_id) {
      const { data: audio, error: aErr } = await userClient
        .from("audio_uploads")
        .select("*")
        .eq("id", audio_upload_id)
        .single();
      if (aErr || !audio) return json({ error: aErr?.message ?? "Audio not found" }, 404);

      if (audio.transcript_status === "done" && audio.transcript) {
        transcript = audio.transcript;
      } else {
        await userClient
          .from("audio_uploads")
          .update({ transcript_status: "processing", transcript_error: null })
          .eq("id", audio_upload_id);

        const { data: signed, error: sigErr } = await userClient.storage
          .from("audio-ideas")
          .createSignedUrl(audio.storage_path, 600);
        if (sigErr || !signed?.signedUrl) {
          await userClient
            .from("audio_uploads")
            .update({ transcript_status: "failed", transcript_error: sigErr?.message ?? "sign url failed" })
            .eq("id", audio_upload_id);
          return json({ error: sigErr?.message ?? "Could not sign URL" }, 500);
        }
        const audioRes = await fetch(signed.signedUrl);
        if (!audioRes.ok) {
          await userClient
            .from("audio_uploads")
            .update({ transcript_status: "failed", transcript_error: `download ${audioRes.status}` })
            .eq("id", audio_upload_id);
          return json({ error: `Download failed: ${audioRes.status}` }, 500);
        }
        const audioBlob = await audioRes.blob();
        const filename = audio.storage_path.split("/").pop() ?? "audio.webm";
        try {
          transcript = await transcribeWithWhisper(audioBlob, filename);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await userClient
            .from("audio_uploads")
            .update({ transcript_status: "failed", transcript_error: msg.slice(0, 500) })
            .eq("id", audio_upload_id);
          return json({ error: msg }, 502);
        }
        await userClient
          .from("audio_uploads")
          .update({ transcript, transcript_status: "done", transcript_error: null })
          .eq("id", audio_upload_id);
      }
    }

    let concept = [transcript, raw_concept_input].filter(Boolean).join("\n\n").trim();
    if (!concept && regenerationFallbackConcept) {
      concept = regenerationFallbackConcept.trim();
    }
    if (!concept && !idea_reference_id && !referent_video_id) {
      return json({ error: "Empty concept after transcription" }, 400);
    }

    // Resolve effective ids: explicit body wins, sino los del script existente (en regeneración).
    const effective_format_id = format_id ?? regenerationFallback.format_id;
    const effective_shape_id = shape_id ?? regenerationFallback.shape_id;
    const effective_series_id = series_id ?? regenerationFallback.series_id;
    const effective_part_number = part_number ?? regenerationFallback.part_number;

    // -- Idea reference -------------------------------------------------------
    let referenceBlock: string | undefined;
    if (idea_reference_id) {
      const { data: ref, error: refErr } = await userClient
        .from("idea_references")
        .select(
          "id, owner_id, source_url, platform, title, caption, transcript, transcript_status",
        )
        .eq("id", idea_reference_id)
        .single();
      if (refErr || !ref) {
        return json({ error: refErr?.message ?? "idea_reference not found" }, 404);
      }
      if (ref.transcript_status !== "done" || !ref.transcript) {
        return json(
          { error: "La referencia aún se está procesando. Esperá a que termine de analizarse." },
          422,
        );
      }
      const hasUserConcept = concept.trim().length > 0;
      // Si el usuario no eligió modo, default según haya concepto propio o no:
      // - Sin concepto propio → content_adapt (la referencia ES el contenido).
      // - Con concepto propio → content_adapt también (el texto manda como ajustes).
      const reference_mode = reference_mode_input ?? "content_adapt";
      referenceBlock = buildReferenceBlock({
        platform: ref.platform,
        source_url: ref.source_url,
        title: ref.title,
        caption: ref.caption,
        transcript: ref.transcript,
        mode: reference_mode,
        hasUserConcept,
      });
    }

    // -- Referent video (banco de virales) ------------------------------------
    if (referent_video_id) {
      const { data: rv, error: rvErr } = await userClient
        .from("referent_videos")
        .select(
          "id, referent_id, source_url, platform, title, caption, views_total, transcript, transcript_status, concept_summary, concept_status, referents(name)",
        )
        .eq("id", referent_video_id)
        .single();
      if (rvErr || !rv) {
        return json({ error: rvErr?.message ?? "referent_video not found" }, 404);
      }
      if (rv.transcript_status !== "done" || !rv.transcript) {
        return json(
          {
            error:
              "El video del referente todavía no fue analizado. Tocá 'Analizar' en la card antes de adaptar.",
          },
          422,
        );
      }
      const hasUserConcept = concept.trim().length > 0;
      const reference_mode = reference_mode_input ?? "content_adapt";
      // RV doesn't expose a referent name in the row by default — extract from join.
      // Postgrest returns the related row as object or array depending on join cardinality.
      // referent_videos.referent_id has many-to-one to referents, so it's an object.
      const referentRow = rv.referents as { name?: string } | { name?: string }[] | null;
      const referentName = Array.isArray(referentRow)
        ? referentRow[0]?.name ?? null
        : referentRow?.name ?? null;
      referenceBlock = buildReferenceBlock({
        platform: rv.platform,
        source_url: rv.source_url,
        title: rv.title,
        caption: rv.caption,
        transcript: rv.transcript,
        mode: reference_mode,
        hasUserConcept,
        conceptSummary: rv.concept_status === "done" ? rv.concept_summary : null,
        referentName,
        views: rv.views_total,
      });
    }

    // -- Format ---------------------------------------------------------------
    let formatName: string | undefined;
    let formatDescription: string | undefined;
    if (effective_format_id) {
      const { data: f } = await userClient
        .from("formats")
        .select("name, description")
        .eq("id", effective_format_id)
        .maybeSingle();
      if (f) {
        formatName = f.name;
        formatDescription = f.description ?? undefined;
      }
    }

    // -- Shape ----------------------------------------------------------------
    let shapeName: string | undefined;
    let shapeDescription: string | undefined;
    if (effective_shape_id) {
      const { data: sh } = await userClient
        .from("shapes")
        .select("name, description")
        .eq("id", effective_shape_id)
        .maybeSingle();
      if (sh) {
        shapeName = sh.name;
        shapeDescription = sh.description ?? undefined;
      }
    }

    // -- Series + parts already covered ---------------------------------------
    let seriesName: string | undefined;
    let seriesDescription: string | undefined;
    let seriesPriorScripts: SeriesPriorScript[] = [];
    if (effective_series_id) {
      const { data: ser } = await userClient
        .from("series")
        .select("name, description")
        .eq("id", effective_series_id)
        .maybeSingle();
      if (ser) {
        seriesName = ser.name;
        seriesDescription = ser.description ?? undefined;
      }
      const { data: priorParts } = await userClient
        .from("scripts")
        .select("id, part_number, title, hook, ai_summary")
        .eq("series_id", effective_series_id)
        .order("part_number", { ascending: true })
        .limit(20);
      seriesPriorScripts = (priorParts ?? [])
        .filter((p) => (target_script_id ? p.id !== target_script_id : true))
        .filter((p) => p.part_number !== effective_part_number)
        .map(({ id: _id, ...rest }) => rest as SeriesPriorScript);
    }

    // -- Few-shot from prior scripts -----------------------------------------
    const { data: priorScripts } = await userClient
      .from("scripts")
      .select(
        "title, hook, development, cta, tone, content_bucket, avatar_target, hook_reference, mental_model",
      )
      .in("status", ["posted", "recorded", "scheduled"])
      .order("created_at", { ascending: false })
      .limit(5);

    const userPromptText = buildUserPrompt({
      concept,
      formatName,
      formatDescription,
      shapeName,
      shapeDescription,
      seriesName,
      seriesDescription,
      partNumber: effective_part_number,
      seriesPriorScripts,
      fewShotScripts: priorScripts ?? [],
      referenceBlock,
    });

    // -- Claude call (with one corrective retry on validation failure) -------
    const messages: ClaudeMessage[] = [{ role: "user", content: userPromptText }];

    let result: ClaudeToolResult;
    let usage: ClaudeUsage = {};
    let generationWarning: string | null = null;

    try {
      const first = await callClaude(messages);
      result = first.result;
      usage = first.usage;
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : String(err) }, 502);
    }

    const validation1 = validateResult(result);
    if (!validation1.ok) {
      // Reintento correctivo: agregamos la respuesta inválida + un mensaje de corrección.
      messages.push({
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: "submit_script_first",
            name: "submit_script",
            input: result as unknown as Record<string, unknown>,
          },
        ],
      });
      messages.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: "submit_script_first",
            content: buildRetryUserMessage(validation1.reasons),
          },
        ],
      });

      try {
        const second = await callClaude(messages);
        const validation2 = validateResult(second.result);
        if (validation2.ok) {
          result = second.result;
          usage = second.usage;
        } else {
          // Reincide: usamos la 2da versión pero dejamos warning visible.
          result = second.result;
          usage = second.usage;
          generationWarning = `Reintento correctivo no resolvió: ${validation2.reasons.join("; ")}. Original: ${validation1.reasons.join("; ")}`;
        }
      } catch (err) {
        // Si el retry falla por API error, persistimos la versión original con warning.
        generationWarning = `Validación inicial falló (${validation1.reasons.join("; ")}). Retry no respondió: ${err instanceof Error ? err.message : String(err)}`;
      }
    }

    // -- Sanitización ligera ---------------------------------------------------
    const cleanHashtags = (result.hashtags ?? [])
      .map(sanitizeHashtag)
      .filter((t) => t.length > 0)
      .slice(0, 7);

    const cleanPlatformCodes = Array.isArray(result.platform_codes)
      ? result.platform_codes.filter((c) => typeof c === "string")
      : [];

    const generated_script = `${result.hook}\n\n${result.development}\n\n${result.cta}`;
    const word_count = wordCount(generated_script);

    const brolls = (result.brolls ?? []).map((b, i) => ({
      position: typeof b.position === "number" ? b.position : i,
      suggestion: b.suggestion,
      cue_text: b.cue_text ?? null,
    }));

    const story = result.storytelling ?? { setup: "", conflict: "", resolution: "" };
    const isStoryPopulated = !!(story.setup?.trim() || story.conflict?.trim() || story.resolution?.trim());

    // -- Persistencia: regeneración in-place o RPC insert --------------------
    if (target_script_id) {
      const updatePayload: Record<string, unknown> = {
        audio_upload_id: audio_upload_id ?? null,
        format_id: effective_format_id,
        shape_id: effective_shape_id,
        series_id: effective_series_id,
        part_number: effective_part_number,
        raw_concept: concept,
        title: result.title,
        generated_script,
        hook: result.hook,
        development: result.development,
        cta: result.cta,
        word_count,
        estimated_wpm: result.estimated_wpm,
        tone: result.tone,
        ai_summary: result.ai_summary,
        content_bucket: result.content_bucket ?? null,
        avatar_target: result.avatar_target ?? null,
        hook_reference: result.hook_reference ?? null,
        hook_alternatives: result.hook_alternatives ?? [],
        visual_hook_format: result.visual_hook_format ?? null,
        on_screen_text: result.on_screen_text ?? null,
        caption: result.caption ?? null,
        hashtags: cleanHashtags,
        seo_keywords: result.seo_keywords ?? [],
        why_it_works: result.why_it_works ?? null,
        mental_model: result.mental_model ?? null,
        platform_codes: cleanPlatformCodes,
        storytelling_setup: isStoryPopulated ? story.setup || null : null,
        storytelling_conflict: isStoryPopulated ? story.conflict || null : null,
        storytelling_resolution: isStoryPopulated ? story.resolution || null : null,
        generation_warning: generationWarning,
        idea_reference_id: idea_reference_id,
        reference_mode: idea_reference_id ? (reference_mode_input ?? "content_adapt") : null,
        referent_video_id: referent_video_id,
      };

      const { error: updErr } = await userClient
        .from("scripts")
        .update(updatePayload)
        .eq("id", target_script_id);
      if (updErr) return json({ error: `Update failed: ${updErr.message}` }, 500);

      // Reemplazar brolls: borrar viejos + insertar nuevos.
      const { error: delErr } = await userClient
        .from("broll_suggestions")
        .delete()
        .eq("script_id", target_script_id);
      if (delErr) return json({ error: `Brolls delete failed: ${delErr.message}` }, 500);

      if (brolls.length > 0) {
        const { error: insErr } = await userClient
          .from("broll_suggestions")
          .insert(brolls.map((b) => ({ ...b, script_id: target_script_id })));
        if (insErr) return json({ error: `Brolls insert failed: ${insErr.message}` }, 500);
      }

      return json({
        ok: true,
        script_id: target_script_id,
        regenerated: true,
        cache: {
          cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
          cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
        },
        warning: generationWarning,
      });
    }

    const { data: scriptId, error: rpcErr } = await userClient.rpc(
      "create_script_with_brolls",
      {
        _audio_upload_id: audio_upload_id,
        _format_id: effective_format_id,
        _raw_concept: concept,
        _title: result.title,
        _generated_script: generated_script,
        _hook: result.hook,
        _development: result.development,
        _cta: result.cta,
        _word_count: word_count,
        _estimated_wpm: result.estimated_wpm,
        _tone: result.tone,
        _ai_summary: result.ai_summary,
        _brolls: brolls,
        _content_bucket: result.content_bucket ?? null,
        _avatar_target: result.avatar_target ?? null,
        _hook_reference: result.hook_reference ?? null,
        _hook_alternatives: result.hook_alternatives ?? [],
        _visual_hook_format: result.visual_hook_format ?? null,
        _on_screen_text: result.on_screen_text ?? null,
        _caption: result.caption ?? null,
        _hashtags: cleanHashtags,
        _seo_keywords: result.seo_keywords ?? [],
        _why_it_works: result.why_it_works ?? null,
        _mental_model: result.mental_model ?? null,
        _platform_codes: cleanPlatformCodes,
        _storytelling_setup: isStoryPopulated ? story.setup || null : null,
        _storytelling_conflict: isStoryPopulated ? story.conflict || null : null,
        _storytelling_resolution: isStoryPopulated ? story.resolution || null : null,
        _generation_warning: generationWarning,
        _idea_reference_id: idea_reference_id,
        _reference_mode: idea_reference_id ? (reference_mode_input ?? "content_adapt") : null,
        _shape_id: effective_shape_id,
        _series_id: effective_series_id,
        _part_number: effective_part_number,
        _referent_video_id: referent_video_id,
      },
    );
    if (rpcErr) return json({ error: `RPC failed: ${rpcErr.message}` }, 500);

    return json({
      ok: true,
      script_id: scriptId,
      cache: {
        cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
        cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
      },
      warning: generationWarning,
    });
  } catch (err) {
    return json({ error: String(err instanceof Error ? err.message : err) }, 500);
  }
});
