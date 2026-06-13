// predict-virality — pronóstico de viralidad por plataforma para un scheduled_post
// AÚN NO publicado. Devuelve, por plataforma (instagram/tiktok/youtube):
//   - virality_score 0-100 (RELATIVO al canal: 50 = post mediano del creador)
//   - views estimadas (point + rango low/high)
//   - tier (outlier/5x/3x/normal/underperform), key_drivers, referent_signals, risks
//
// Contexto = SOLO datos propios de la DB:
//   A) baselines del creador por plataforma (medianas/percentiles de views)
//   B) few-shot: videos pasados del creador con su contenido + views finales
//   C) corpus de referentes ya scrapeados, normalizado por la mediana de CADA
//      referente (rel_lift) → señal de "ADN viral" transferible entre creadores
//   D) calibración: errores de predicciones pasadas evaluadas (autocorrección)
//
// Persiste una fila por (scheduled_post, plataforma, model_version) en
// public.post_predictions (upsert idempotente; `force` re-predice).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const CLAUDE_MODEL = "claude-sonnet-4-6";
const CLAUDE_MAX_TOKENS = 4000;
const MODEL_VERSION = "virality-v1";

const ALL_PLATFORMS = ["instagram", "tiktok", "youtube"] as const;
type Platform = (typeof ALL_PLATFORMS)[number];

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

// Robust service-role detection: matches the env key by string (legacy/new
// formats) OR decodes the JWT and checks role=service_role. Mirrors publish-now
// so the cron (which uses the vault key — a legacy JWT that may differ from the
// runtime's SUPABASE_SERVICE_ROLE_KEY string) is accepted.
function getJwtRole(authHeader: string): string | null {
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "===".slice((b64.length + 3) % 4);
    const payload = JSON.parse(atob(padded));
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

function isServiceRoleCaller(req: Request, serviceKey: string): boolean {
  const auth = req.headers.get("Authorization") ?? "";
  const apiKey = req.headers.get("apikey") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
  if (token && token === serviceKey) return true;
  if (apiKey && apiKey === serviceKey) return true;
  if (getJwtRole(auth) === "service_role") return true;
  return false;
}

// Claude a veces emite secuencias \uXXXX literales en vez de caracteres decodificados.
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
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = decodeUnicodeEscapes(v);
    }
    return out as T;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Numeric helpers (medians/percentiles computed in JS over tiny datasets)
// ---------------------------------------------------------------------------

function percentile(sorted: number[], q: number): number | null {
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * q;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function round(n: number | null): number | null {
  return n == null ? null : Math.round(n);
}

function clampInt(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === "number" && isFinite(n) ? n : fallback;
  return Math.max(min, Math.min(max, Math.round(v)));
}

function clampNum(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === "number" && isFinite(n) ? n : fallback;
  return Math.max(min, Math.min(max, v));
}

// Postgres `numeric` columns come back from PostgREST as STRINGS — coerce before
// any numeric use (e.g. the calibration errors read from post_predictions).
function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

// Tier RELATIVO a la mediana del creador en esa plataforma. Mismo umbral que el
// trigger calculate_video_multiplier() (3x/5x/7x), pero per-platform-vs-median.
// Se reusa idéntico en evaluate-prediction para que predicho y real sean comparables.
function tierFromRatio(r: number | null): string {
  if (r == null || !isFinite(r)) return "normal";
  if (r >= 7) return "outlier";
  if (r >= 5) return "5x";
  if (r >= 3) return "3x";
  if (r >= 0.5) return "normal";
  return "underperform";
}

// ---------------------------------------------------------------------------
// Claude tool
// ---------------------------------------------------------------------------

interface PredictionItem {
  platform: Platform;
  virality_score: number;
  views_point: number;
  views_low: number;
  views_high: number;
  confidence: number;
  key_drivers?: Array<{ factor: string; direction: string; weight?: number; note: string }>;
  referent_signals?: Array<{
    referent_name: string;
    concept?: string;
    their_lift?: number;
    similarity: string;
    note: string;
  }>;
  risks?: Array<{ risk: string; severity: string; note?: string }>;
  reasoning: string;
}

const EMIT_PREDICTION_TOOL = {
  name: "emit_prediction",
  description:
    "Emití la predicción de viralidad por plataforma para un video corto NO publicado, anclada al historial del creador y al corpus de referentes de su base de datos.",
  input_schema: {
    type: "object",
    properties: {
      predictions: {
        type: "array",
        description: "Un objeto por cada plataforma pedida.",
        items: {
          type: "object",
          properties: {
            platform: { type: "string", enum: ["instagram", "tiktok", "youtube"] },
            virality_score: {
              type: "integer",
              minimum: 0,
              maximum: 100,
              description:
                "0-100 RELATIVO al canal del creador. ~50 = su post mediano en ESTA plataforma; 80+ = outlier (varias x su mediana); <30 = por debajo de lo normal.",
            },
            views_point: {
              type: "integer",
              minimum: 0,
              description: "Views de por vida más probables. Anclado al alcance histórico del creador.",
            },
            views_low: { type: "integer", minimum: 0, description: "Piso plausible (~p20). <= views_point." },
            views_high: { type: "integer", minimum: 0, description: "Techo plausible (~p80). >= views_point." },
            confidence: {
              type: "number",
              minimum: 0,
              maximum: 1,
              description: "Más baja con pocos ejemplos, contenido fuera de distribución o sin transcript.",
            },
            key_drivers: {
              type: "array",
              description: "2-5 factores de contenido que más mueven la predicción, rankeados.",
              items: {
                type: "object",
                properties: {
                  factor: { type: "string", description: "p.ej. 'fuerza del hook', 'encaje del tópico', 'duración', 'formato'." },
                  direction: { type: "string", enum: ["positive", "negative"] },
                  weight: { type: "number", minimum: 0, maximum: 1 },
                  note: { type: "string" },
                },
                required: ["factor", "direction", "note"],
              },
            },
            referent_signals: {
              type: "array",
              description: "Referentes de la base que fundamentan la predicción (señal de ADN viral).",
              items: {
                type: "object",
                properties: {
                  referent_name: { type: "string" },
                  concept: { type: "string" },
                  their_lift: { type: "number", description: "Cuánto sobre-rindió ese video para SU propio creador (x mediana)." },
                  similarity: { type: "string", enum: ["low", "medium", "high"] },
                  note: { type: "string" },
                },
                required: ["referent_name", "similarity", "note"],
              },
            },
            risks: {
              type: "array",
              description: "0-3 riesgos de bajo rendimiento.",
              items: {
                type: "object",
                properties: {
                  risk: { type: "string" },
                  severity: { type: "string", enum: ["low", "medium", "high"] },
                  note: { type: "string" },
                },
                required: ["risk", "severity"],
              },
            },
            reasoning: { type: "string", description: "<=400 caracteres, español, por qué ese número vs la mediana del creador." },
          },
          required: [
            "platform",
            "virality_score",
            "views_point",
            "views_low",
            "views_high",
            "confidence",
            "key_drivers",
            "referent_signals",
            "reasoning",
          ],
        },
      },
    },
    required: ["predictions"],
  },
};

// ---------------------------------------------------------------------------
// System prompt (cacheable blocks)
// ---------------------------------------------------------------------------

interface SystemBlock {
  type: "text";
  text: string;
  cache_control: { type: "ephemeral" };
}

const SYS_ROLE = `Sos un sistema de pronóstico de viralidad para UN creador de contenido corto (Reels de Instagram, TikTok y YouTube Shorts). Tu trabajo: predecir, por plataforma, cuántas views hará un video AÚN NO PUBLICADO, y un puntaje de viralidad 0-100.

REGLAS MARCO:
1. Todo es RELATIVO a este creador. 50 = su post mediano en esa plataforma; 80-100 = outlier (varias veces su mediana); <30 = por debajo de lo normal para él.
2. Con pocos datos, sé humilde: ante incertidumbre, ampliá el rango [low, high] y bajá la confianza, en vez de tirar números altos.
3. Usá EXCLUSIVAMENTE los datos provistos en este prompt (historial del creador + corpus de referentes de su base). NO uses conocimiento de internet, benchmarks externos, ni cifras que no estén acá.`;

const SYS_METHOD = `CÓMO ESTIMAR:
- El ancla es la MEDIANA del creador en esa plataforma. Ajustá hacia arriba/abajo según qué tan parecido es el contenido nuevo (hook, tópico, formato, estructura) a: (a) sus propios videos que sobre-rindieron, y (b) los videos de referentes que sobre-rindieron.
- NUNCA ancles a un solo outlier. Mirá medianas y p75, no el máximo.
- point = lo más probable; low ≈ piso plausible (~p20); high ≈ techo plausible (~p80). Siempre low <= point <= high.

REFERENTES (CRÍTICO):
- Los views ABSOLUTOS de un referente reflejan SU tamaño de audiencia, no el del creador. NO los copies como predicción.
- Usalos SOLO para: (a) detectar qué conceptos/hooks/tópicos/formatos sobre-rinden en el nicho y CUÁNTO (lift = views ÷ mediana del propio referente), y (b) juzgar el "ADN viral" del video nuevo.
- El número absoluto que devolvés se ancla SIEMPRE al historial del creador, ajustado por ese lift.
- Un lift altísimo (p.ej. 30x+) suele venir de medianas con poca muestra: tratalo con cautela.

CALIBRACIÓN:
- Si te paso errores de predicciones pasadas (p.ej. "venís sobreestimando IG +30%"), corregí explícitamente en esa dirección.

PUNTUACIÓN/TIER: el tier lo calcula el sistema a partir de tus views (ratio vs la mediana del creador), no hace falta que lo devuelvas. Enfocate en que views_point y virality_score sean coherentes entre sí.`;

function buildCreatorProfileBlock(p: Record<string, unknown> | null): string | null {
  if (!p) return null;
  const lines: string[] = [];
  if (p.product_service) lines.push(`Producto/servicio: ${p.product_service}`);
  if (p.target_audience) lines.push(`Audiencia objetivo: ${p.target_audience}`);
  if (p.short_form_strategy) lines.push(`Estrategia short-form: ${p.short_form_strategy}`);
  if (p.who_am_i) lines.push(`Quién es: ${p.who_am_i}`);
  if (lines.length === 0) return null;
  return `PERFIL DEL CREADOR (contexto de nicho):\n${lines.join("\n")}`;
}

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------

interface Baseline {
  n: number;
  median: number | null;
  p25: number | null;
  p75: number | null;
  max: number | null;
  avg_eng_ratio: number | null;
}

interface OwnExample {
  platform: Platform;
  views: number;
  title: string | null;
  hook: string | null;
  caption: string | null;
  format: string | null;
  shape: string | null;
  topic: string | null;
}

interface ReferentExample {
  platform: Platform;
  referent_name: string;
  views: number;
  rel_lift: number | null;
  concept_summary: string | null;
  main_topics: string[] | null;
  content_type: string | null;
}

interface Calibration {
  n: number;
  median_abs_pct_error: number | null;
  median_signed_pct_error: number | null;
  within_range_rate: number | null;
}

function fmt(n: number | null | undefined): string {
  if (n == null) return "?";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

// ---------------------------------------------------------------------------
// User message builder
// ---------------------------------------------------------------------------

function buildUserMessage(args: {
  platforms: Platform[];
  input: {
    title: string | null;
    captionByPlatform: Record<string, string | null>;
    hashtags: string[];
    formatName: string | null;
    formatDescription: string | null;
    shapeName: string | null;
    hook: string | null;
    transcript: string | null;
    hasTranscript: boolean;
  };
  baselines: Record<string, Baseline>;
  ownExamples: OwnExample[];
  referents: ReferentExample[];
  calibration: Record<string, Calibration>;
}): string {
  const { platforms, input, baselines, ownExamples, referents, calibration } = args;

  const inputBlock = [
    "=== VIDEO NUEVO A PREDECIR ===",
    input.title ? `Título: ${input.title}` : "",
    `Formato: ${input.formatName ? `${input.formatName}${input.formatDescription ? ` — ${input.formatDescription}` : ""}` : "(no especificado)"}`,
    input.shapeName ? `Estructura (shape): ${input.shapeName}` : "",
    input.hook ? `Hook: ${input.hook}` : "",
    `Hashtags: ${input.hashtags.length ? input.hashtags.map((h) => `#${h}`).join(" ") : "(ninguno)"}`,
    "Captions por plataforma:",
    ...platforms.map((p) => `  - ${p}: ${input.captionByPlatform[p] ? `"${input.captionByPlatform[p]}"` : "(usa el default / vacío)"}`),
    "",
    input.hasTranscript
      ? `Transcript del video:\n"""\n${(input.transcript ?? "").slice(0, 6000)}\n"""`
      : "Transcript: (NO disponible — bajá la confianza y notalo como riesgo).",
  ]
    .filter(Boolean)
    .join("\n");

  const baselineBlock = [
    "=== HISTORIAL DEL CREADOR POR PLATAFORMA (baselines) ===",
    ...platforms.map((p) => {
      const b = baselines[p];
      if (!b || b.n === 0) return `- ${p}: SIN historial todavía (cold start — estimá amplio, confianza baja).`;
      return `- ${p}: n=${b.n} · mediana=${fmt(b.median)} · p25=${fmt(b.p25)} · p75=${fmt(b.p75)} · max=${fmt(b.max)} · engagement≈${b.avg_eng_ratio != null ? (b.avg_eng_ratio * 100).toFixed(1) + "%" : "?"}`;
    }),
  ].join("\n");

  const exBlock = (p: Platform): string => {
    const items = ownExamples
      .filter((e) => e.platform === p)
      .sort((a, b) => b.views - a.views)
      .slice(0, 12);
    if (items.length === 0) return `  (sin ejemplos en ${p})`;
    return items
      .map((e) => {
        const bits = [
          `${fmt(e.views)} views`,
          e.title ? `título: ${e.title}` : "",
          e.format ? `formato: ${e.format}` : "",
          e.shape ? `shape: ${e.shape}` : "",
          e.hook ? `hook: ${e.hook.slice(0, 140)}` : e.caption ? `caption: ${e.caption.slice(0, 140)}` : "",
          e.topic ? `tema: ${e.topic.slice(0, 200)}` : "",
        ].filter(Boolean);
        return `  • ${bits.join(" · ")}`;
      })
      .join("\n");
  };

  const ownBlock = [
    "=== VIDEOS PASADOS DEL CREADOR (ejemplos, mejores primero) ===",
    ...platforms.map((p) => `${p}:\n${exBlock(p)}`),
  ].join("\n");

  const refBlockFor = (p: Platform): string => {
    const items = referents
      .filter((r) => r.platform === p)
      .sort((a, b) => (b.rel_lift ?? 0) - (a.rel_lift ?? 0))
      .slice(0, 12);
    if (items.length === 0) return `  (sin referentes scrapeados en ${p})`;
    return items
      .map((r) => {
        const bits = [
          r.referent_name,
          `${fmt(r.views)} views`,
          r.rel_lift != null ? `lift ${r.rel_lift.toFixed(1)}x para ese creador` : "lift n/d",
          r.content_type ? `tipo: ${r.content_type}` : "",
          r.main_topics && r.main_topics.length ? `tópicos: ${r.main_topics.slice(0, 4).join(", ")}` : "",
          r.concept_summary ? `concepto: ${r.concept_summary.slice(0, 350)}` : "",
        ].filter(Boolean);
        return `  • ${bits.join(" · ")}`;
      })
      .join("\n");
  };

  const referentBlock = [
    "=== CORPUS DE REFERENTES (señal de ADN viral — NO copiar views absolutos) ===",
    ...platforms.map((p) => `${p}:\n${refBlockFor(p)}`),
  ].join("\n");

  const calibBlock = [
    "=== CALIBRACIÓN (errores de predicciones pasadas) ===",
    ...platforms.map((p) => {
      const c = calibration[p];
      if (!c || c.n === 0) return `- ${p}: sin datos todavía.`;
      const signed = c.median_signed_pct_error;
      const dir =
        signed == null ? "" : signed > 0 ? ` (venís SOBREestimando ~${Math.round(signed)}% → corregí a la baja)` : ` (venís SUBestimando ~${Math.round(Math.abs(signed))}% → corregí a la alta)`;
      return `- ${p}: n=${c.n} · error abs medio=${c.median_abs_pct_error != null ? Math.round(c.median_abs_pct_error) + "%" : "?"} · dentro del rango=${c.within_range_rate != null ? Math.round(c.within_range_rate * 100) + "%" : "?"}${dir}`;
    }),
  ].join("\n");

  return [
    inputBlock,
    "",
    baselineBlock,
    "",
    ownBlock,
    "",
    referentBlock,
    "",
    calibBlock,
    "",
    `=== INSTRUCCIÓN ===\nLlamá a emit_prediction UNA sola vez, devolviendo un objeto por cada plataforma pedida: ${platforms.join(", ")}.`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const isServiceRole = isServiceRoleCaller(req, SUPABASE_SERVICE_ROLE_KEY);

    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let callerId: string | null = null;
    if (!isServiceRole) {
      if (!authHeader) return json({ error: "Missing Authorization" }, 401);
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userErr } = await userClient.auth.getUser();
      if (userErr || !user) return json({ error: "Unauthenticated" }, 401);
      callerId = user.id;
    }

    const body = await req.json().catch(() => ({}));
    const scheduled_post_id = typeof body?.scheduled_post_id === "string" ? body.scheduled_post_id : null;
    const force = body?.force === true;
    const requestedPlatforms: Platform[] = Array.isArray(body?.platforms)
      ? (body.platforms as unknown[]).filter((p): p is Platform => ALL_PLATFORMS.includes(p as Platform))
      : [];

    if (!scheduled_post_id) return json({ error: "scheduled_post_id requerido" }, 400);

    // -- Load scheduled_post + ownership check --------------------------------
    const { data: post, error: postErr } = await service
      .from("scheduled_posts")
      .select(
        "id, owner_id, title, caption_default, captions, hashtags, transcript, transcript_status, transcript_language, format_id, script_id",
      )
      .eq("id", scheduled_post_id)
      .maybeSingle();
    if (postErr) return json({ error: postErr.message }, 500);
    if (!post) return json({ error: "scheduled_post no encontrado" }, 404);
    if (!isServiceRole && post.owner_id !== callerId) return json({ error: "Forbidden" }, 403);

    const ownerId = post.owner_id as string;

    // -- Resolve platforms ----------------------------------------------------
    let platforms: Platform[] = requestedPlatforms;
    if (platforms.length === 0) {
      const { data: jobs } = await service
        .from("publish_jobs")
        .select("platform")
        .eq("scheduled_post_id", scheduled_post_id);
      const fromJobs = Array.from(
        new Set((jobs ?? []).map((j) => j.platform as string)),
      ).filter((p): p is Platform => ALL_PLATFORMS.includes(p as Platform));
      platforms = fromJobs.length ? fromJobs : [...ALL_PLATFORMS];
    }

    // -- Idempotency: short-circuit if all requested platforms already exist --
    const { data: existing } = await service
      .from("post_predictions")
      .select("*")
      .eq("scheduled_post_id", scheduled_post_id)
      .eq("model_version", MODEL_VERSION);
    if (!force && existing && platforms.every((p) => existing.some((e) => e.platform === p))) {
      return json({ ok: true, cached: true, predictions: existing.filter((e) => platforms.includes(e.platform as Platform)) });
    }

    // -- Content input --------------------------------------------------------
    const captionsObj = (post.captions ?? {}) as Record<string, string>;
    const captionByPlatform: Record<string, string | null> = {};
    for (const p of platforms) captionByPlatform[p] = captionsObj[p] || post.caption_default || null;
    const hashtags = (post.hashtags ?? []) as string[];
    const hasTranscript = post.transcript_status === "done" && !!post.transcript;

    let formatName: string | null = null;
    let formatDescription: string | null = null;
    if (post.format_id) {
      const { data: f } = await service.from("formats").select("name, description").eq("id", post.format_id).maybeSingle();
      formatName = f?.name ?? null;
      formatDescription = f?.description ?? null;
    }

    let shapeName: string | null = null;
    let hook: string | null = null;
    if (post.script_id) {
      const { data: s } = await service
        .from("scripts")
        .select("hook, shape_id, shapes(name)")
        .eq("id", post.script_id)
        .maybeSingle();
      hook = s?.hook ?? null;
      const sh = s?.shapes as { name?: string } | { name?: string }[] | null;
      shapeName = Array.isArray(sh) ? sh[0]?.name ?? null : sh?.name ?? null;
    }

    // -- A+B: own video_posts (views_total is the latest scraped value) -------
    const { data: vpRows } = await service
      .from("video_posts")
      .select(
        "platform, views_total, likes, comments, shares, saves, caption, videos!inner(owner_id, title, transcript, scripts(hook), formats(name), shapes(name))",
      )
      .eq("videos.owner_id", ownerId)
      .not("views_total", "is", null);

    const baselines: Record<string, Baseline> = {};
    const ownExamples: OwnExample[] = [];
    for (const p of platforms) {
      const rows = (vpRows ?? []).filter((r) => r.platform === p && typeof r.views_total === "number");
      const views = rows.map((r) => r.views_total as number).sort((a, b) => a - b);
      const engRatios = rows
        .map((r) => {
          const v = r.views_total as number;
          if (!v) return null;
          const eng = (r.likes ?? 0) + (r.comments ?? 0) + (r.shares ?? 0) + (r.saves ?? 0);
          return eng / v;
        })
        .filter((x): x is number => x != null);
      baselines[p] = {
        n: views.length,
        median: round(percentile(views, 0.5)),
        p25: round(percentile(views, 0.25)),
        p75: round(percentile(views, 0.75)),
        max: views.length ? views[views.length - 1] : null,
        avg_eng_ratio: engRatios.length ? engRatios.reduce((a, b) => a + b, 0) / engRatios.length : null,
      };
      for (const r of rows) {
        const v = r.videos as {
          title?: string; transcript?: string;
          scripts?: { hook?: string } | null; formats?: { name?: string } | null; shapes?: { name?: string } | null;
        };
        ownExamples.push({
          platform: p,
          views: r.views_total as number,
          title: v?.title ?? null,
          hook: v?.scripts?.hook ?? null,
          caption: r.caption ?? null,
          format: v?.formats?.name ?? null,
          shape: v?.shapes?.name ?? null,
          topic: v?.transcript ? v.transcript.slice(0, 220) : null,
        });
      }
    }

    // -- C: referent corpus normalized by each referent's own median ----------
    const { data: refRows } = await service
      .from("referent_videos")
      .select(
        "platform, views_total, concept_summary, main_topics, content_type, referents!inner(name, owner_id)",
      )
      .eq("referents.owner_id", ownerId)
      .not("views_total", "is", null);

    const referents: ReferentExample[] = [];
    // per-referent per-platform medians (need >=3 videos to trust; else fallback to platform-global median)
    const byRefPlat = new Map<string, number[]>();
    const byPlat = new Map<string, number[]>();
    for (const r of refRows ?? []) {
      const ref = r.referents as { name?: string } | { name?: string }[] | null;
      const refName = Array.isArray(ref) ? ref[0]?.name : ref?.name;
      const key = `${refName ?? "Referente"}__${r.platform}`;
      if (!byRefPlat.has(key)) byRefPlat.set(key, []);
      byRefPlat.get(key)!.push(r.views_total as number);
      if (!byPlat.has(r.platform)) byPlat.set(r.platform, []);
      byPlat.get(r.platform)!.push(r.views_total as number);
    }
    const medianOf = (arr: number[] | undefined): number | null =>
      arr ? percentile([...arr].sort((a, b) => a - b), 0.5) : null;

    for (const r of refRows ?? []) {
      const p = r.platform as Platform;
      if (!platforms.includes(p)) continue;
      const ref = r.referents as { name?: string } | { name?: string }[] | null;
      const refName = (Array.isArray(ref) ? ref[0]?.name : ref?.name) ?? "Referente";
      const refArr = byRefPlat.get(`${refName}__${p}`);
      const refMed = refArr && refArr.length >= 3 ? medianOf(refArr) : medianOf(byPlat.get(p));
      const lift = refMed && refMed > 0 ? (r.views_total as number) / refMed : null;
      referents.push({
        platform: p,
        referent_name: refName,
        views: r.views_total as number,
        rel_lift: lift,
        concept_summary: r.concept_summary ?? null,
        main_topics: (r.main_topics as string[] | null) ?? null,
        content_type: r.content_type ?? null,
      });
    }

    // -- D: calibration from past evaluated predictions -----------------------
    const { data: evalRows } = await service
      .from("post_predictions")
      .select("platform, abs_pct_error, signed_pct_error, within_range, evaluated_at")
      .eq("owner_id", ownerId)
      .eq("model_version", MODEL_VERSION)
      .eq("status", "evaluated")
      .order("evaluated_at", { ascending: false })
      .limit(60);
    const calibration: Record<string, Calibration> = {};
    for (const p of platforms) {
      const rows = (evalRows ?? []).filter((r) => r.platform === p).slice(0, 20);
      const abs = rows.map((r) => toNum(r.abs_pct_error)).filter((x): x is number => x != null).sort((a, b) => a - b);
      const signed = rows.map((r) => toNum(r.signed_pct_error)).filter((x): x is number => x != null).sort((a, b) => a - b);
      const within = rows.filter((r) => typeof r.within_range === "boolean");
      calibration[p] = {
        n: rows.length,
        median_abs_pct_error: percentile(abs, 0.5),
        median_signed_pct_error: percentile(signed, 0.5),
        within_range_rate: within.length ? within.filter((r) => r.within_range).length / within.length : null,
      };
    }

    // -- Creator profile ------------------------------------------------------
    const { data: profile } = await service
      .from("creator_profile")
      .select("product_service, target_audience, short_form_strategy, who_am_i")
      .eq("owner_id", ownerId)
      .maybeSingle();

    // -- Build prompt + call Claude ------------------------------------------
    const systemBlocks: SystemBlock[] = [
      { type: "text", text: SYS_ROLE, cache_control: { type: "ephemeral" } },
      { type: "text", text: SYS_METHOD, cache_control: { type: "ephemeral" } },
    ];
    const profileBlock = buildCreatorProfileBlock(profile as Record<string, unknown> | null);
    if (profileBlock) systemBlocks.push({ type: "text", text: profileBlock, cache_control: { type: "ephemeral" } });

    const userMessage = buildUserMessage({
      platforms,
      input: {
        title: post.title ?? null,
        captionByPlatform,
        hashtags,
        formatName,
        formatDescription,
        shapeName,
        hook,
        transcript: post.transcript ?? null,
        hasTranscript,
      },
      baselines,
      ownExamples,
      referents,
      calibration,
    });

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
        system: systemBlocks,
        messages: [{ role: "user", content: userMessage }],
        tools: [EMIT_PREDICTION_TOOL],
        tool_choice: { type: "tool", name: "emit_prediction" },
      }),
    });
    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      return json({ error: `Claude API ${claudeRes.status}: ${errText.slice(0, 400)}` }, 502);
    }
    const claudeData = (await claudeRes.json()) as {
      content: Array<{ type: string; name?: string; input?: { predictions?: PredictionItem[] } }>;
      usage?: { cache_creation_input_tokens?: number; cache_read_input_tokens?: number };
      stop_reason?: string;
    };
    const toolBlock = (claudeData.content ?? []).find((b) => b.type === "tool_use" && b.name === "emit_prediction");
    if (!toolBlock?.input) return json({ error: "Claude no retornó emit_prediction." }, 502);
    const decoded = decodeUnicodeEscapes(toolBlock.input);
    const items: PredictionItem[] = Array.isArray(decoded.predictions) ? decoded.predictions : [];
    console.log(
      `predict-virality post=${scheduled_post_id} stop=${claudeData.stop_reason} items=${items.length} platforms=${platforms.join(",")}`,
    );

    // -- Build rows (clamp + fallback for missing platforms) ------------------
    const nowIso = new Date().toISOString();
    const rows = platforms.map((p) => {
      const b = baselines[p];
      const median = b?.median ?? null;
      const m = items.find((it) => it.platform === p);

      let point: number, low: number, high: number, score: number, confidence: number;
      let key_drivers: unknown[] = [];
      let referent_signals: unknown[] = [];
      let risks: unknown[] = [];
      let reasoning: string | null = null;

      if (m) {
        point = Math.max(0, Math.round(typeof m.views_point === "number" ? m.views_point : median ?? 0));
        low = Math.max(0, Math.round(typeof m.views_low === "number" ? m.views_low : b?.p25 ?? point));
        high = Math.max(0, Math.round(typeof m.views_high === "number" ? m.views_high : b?.p75 ?? point));
        // enforce low <= point <= high
        low = Math.min(low, point);
        high = Math.max(high, point);
        score = clampInt(m.virality_score, 0, 100, 50);
        confidence = clampNum(m.confidence, 0, 1, 0.4);
        if (!hasTranscript) confidence = Math.min(confidence, 0.3);
        key_drivers = Array.isArray(m.key_drivers) ? m.key_drivers : [];
        referent_signals = Array.isArray(m.referent_signals) ? m.referent_signals : [];
        risks = Array.isArray(m.risks) ? m.risks : [];
        reasoning = typeof m.reasoning === "string" ? m.reasoning : null;
      } else {
        // Fallback baseline-only row (model omitted this platform).
        point = median ?? 0;
        low = b?.p25 ?? point;
        high = b?.p75 ?? (median ? median * 2 : point);
        score = 50;
        confidence = 0.2;
        reasoning = "Fallback: el modelo no devolvió esta plataforma; estimación basada solo en el baseline.";
      }

      const tier = median && median > 0 ? tierFromRatio(point / median) : "normal";

      return {
        owner_id: ownerId,
        scheduled_post_id,
        platform: p,
        predicted_virality_score: score,
        predicted_tier: tier,
        predicted_views_point: point,
        predicted_views_low: low,
        predicted_views_high: high,
        confidence,
        key_drivers,
        risks,
        referent_signals,
        reasoning,
        model_version: MODEL_VERSION,
        baseline_snapshot: baselines[p] ?? {},
        referent_snapshot: { count: referents.filter((r) => r.platform === p).length },
        input_snapshot: {
          has_transcript: hasTranscript,
          format: formatName,
          shape: shapeName,
          hashtags_count: hashtags.length,
          caption_len: (captionByPlatform[p] ?? "").length,
        },
        calibration_snapshot: calibration[p] ?? {},
        status: "predicted",
        error: null,
        updated_at: nowIso,
        // Re-predicting (force) must not carry a prior run's evaluation. Keep an
        // existing video_post_id binding, but clear the actuals/error so a fresh
        // forecast isn't annotated with stale accuracy until the next eval.
        actual_views: null,
        actual_tier: null,
        actual_captured_at: null,
        horizon_label: null,
        abs_pct_error: null,
        signed_pct_error: null,
        within_range: null,
        score_error: null,
        evaluated_at: null,
      };
    });

    const { data: upserted, error: upErr } = await service
      .from("post_predictions")
      .upsert(rows, { onConflict: "scheduled_post_id,platform,model_version" })
      .select();
    if (upErr) return json({ error: `Persist failed: ${upErr.message}` }, 500);

    return json({
      ok: true,
      predictions: upserted ?? [],
      cache: {
        cache_creation_input_tokens: claudeData.usage?.cache_creation_input_tokens ?? 0,
        cache_read_input_tokens: claudeData.usage?.cache_read_input_tokens ?? 0,
      },
    });
  } catch (err) {
    return json({ error: String(err instanceof Error ? err.message : err) }, 500);
  }
});
