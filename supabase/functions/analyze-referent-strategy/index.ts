// analyze-referent-strategy — (M24 + M33) sintetiza informes estratégicos en
// Markdown de un referente a partir de sus videos analizados.
//
// content_mode:
//   'short'    → Instagram + TikTok (estrategia short-form). Incremental.
//   'youtube'  → el canal de YouTube (estrategia de contenido largo; lee el
//                desglose estructurado long_form_breakdown). Incremental.
//   'combined' → síntesis cross-formato: cómo usa cada plataforma/formato y
//                cómo lleva tráfico entre ellas. Se regenera completo cada vez.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

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

type ContentMode = "short" | "youtube" | "combined";

interface VideoRow {
  posted_at: string | null;
  platform: string;
  views_total: number | null;
  title: string | null;
  video_duration: number | null;
  business_objective: string | null;
  content_objectives: string[] | null;
  content_type: string | null;
  main_topics: string[] | null;
  concept_summary: string | null;
  long_form_breakdown: Record<string, unknown> | null;
}

const REPORT_TOOL = {
  name: "emit_strategy_report",
  description: "Devolvé el informe estratégico completo en Markdown.",
  input_schema: {
    type: "object",
    properties: {
      report_markdown: {
        type: "string",
        description:
          "Informe completo en Markdown (con encabezados ##). Seguí EXACTAMENTE las secciones que indica el system prompt, en ese orden. " +
          "Español rioplatense, denso, accionable, sin filler. Citá números de views cuando sean relevantes.",
      },
    },
    required: ["report_markdown"],
  },
} as const;

const BASE_TONE =
  `Español rioplatense, denso, accionable, sin filler. Pensá como un estratega que quiere ahorrarle años de prueba y error a otro creador: identificá patrones, qué funcionó y qué no. ` +
  `Inferí el modelo de negocio a partir de lo que el referente dice y promociona. Nunca digas "imaginate", "te voy a explicar", "spoiler:", "esto lo cambia todo".`;

const SYSTEM_SHORT =
  `Sos un analista de estrategia de contenido SHORT-FORM. Te paso el catálogo de videos cortos (Instagram + TikTok) ya analizados de un referente, ordenados por fecha. ` +
  `Producí un informe en Markdown vía la tool emit_strategy_report con estas secciones EN ORDEN: ` +
  `'## Resumen estratégico', '## Objetivos de negocio' (mix viralidad/nutrición/conversión con %), '## Objetivos y tipos de contenido', '## Temas principales', ` +
  `'## Evolución en el tiempo' (qué cambió en temas/formato/estilo, qué dejó y qué empezó a hacer), ` +
  `'## El negocio del referente' (¿producto propio? ¿qué vende? ¿cómo usa el contenido corto como herramienta de venta?). ${BASE_TONE}`;

const SYSTEM_YOUTUBE =
  `Sos un analista de estrategia de contenido LARGO (canal de YouTube). Te paso los videos del canal ya analizados de un referente, ordenados por fecha. Muchos vienen con un desglose estructurado (tesis, estructura por capítulos, argumentos, oferta/CTA, tácticas de retención). ` +
  `Producí un informe en Markdown vía la tool emit_strategy_report con estas secciones EN ORDEN: ` +
  `'## Resumen estratégico (YouTube)', ` +
  `'## Arquitectura del contenido largo' (cómo abren/desarrollan/cierran sus videos, duración típica, formatos recurrentes), ` +
  `'## Series y pilares de contenido' (temáticas y series que repite), ` +
  `'## Objetivos de negocio' (mix viralidad/nutrición/conversión), ` +
  `'## Dónde y cómo monetiza' (dónde caen las ofertas/CTAs dentro de los videos largos, qué vende), ` +
  `'## Retención y enganche' (tácticas para sostener la atención en formato largo), ` +
  `'## Uso de Shorts' (si el canal tiene Shorts, cómo los usa: anzuelo, repurpose, funnel; si no hay, decilo), ` +
  `'## Evolución en el tiempo'. ${BASE_TONE}`;

const SYSTEM_COMBINED =
  `Sos un analista de estrategia OMNICANAL. Te paso TODO el contenido analizado de un referente — sus videos cortos (Instagram + TikTok) y los de su canal de YouTube (con desglose estructurado) — más, si existen, sus informes previos de corto y de YouTube. ` +
  `Tu tarea: una SÍNTESIS cross-formato que explique la jugada completa. Producí un informe en Markdown vía la tool emit_strategy_report con estas secciones EN ORDEN: ` +
  `'## Síntesis estratégica' (la jugada completa en pocas frases), ` +
  `'## Rol de cada plataforma y formato' (qué objetivo cumple IG/TikTok vs YouTube, corto vs largo), ` +
  `'## Flujo de tráfico y embudo' (cómo lleva audiencia entre plataformas/formatos: corto → largo → oferta; dónde está la conversión real), ` +
  `'## Dónde está el negocio' (producto, método de venta, qué formato cierra la venta), ` +
  `'## Qué replicar' (lo accionable y priorizado para otro creador). ${BASE_TONE}`;

const SYSTEM_BY_MODE: Record<ContentMode, string> = {
  short: SYSTEM_SHORT,
  youtube: SYSTEM_YOUTUBE,
  combined: SYSTEM_COMBINED,
};

const PLATFORMS_BY_MODE: Record<ContentMode, string[]> = {
  short: ["instagram", "tiktok"],
  youtube: ["youtube"],
  combined: ["instagram", "tiktok", "youtube"],
};

const MODE_LABEL: Record<ContentMode, string> = {
  short: "Redes cortas (IG · TikTok)",
  youtube: "YouTube",
  combined: "Síntesis cross-formato",
};

interface LongFormBreakdown {
  thesis?: string;
  structure?: Array<{ title?: string }>;
  offer_or_cta?: string;
  retention_tactics?: string[];
}

function fmtVideo(v: VideoRow, i: number, withLongForm: boolean): string {
  const date = v.posted_at ? v.posted_at.slice(0, 10) : "s/f";
  const dur = v.video_duration ? ` · ${Math.round(v.video_duration / 60)}min` : "";
  const lines = [
    `### Video ${i + 1} — ${date} · ${v.platform}${dur} · ${v.views_total ?? "n/a"} views`,
    v.title ? `Título: ${v.title}` : "",
    `Objetivo negocio: ${v.business_objective ?? "n/a"} · Objetivos contenido: ${(v.content_objectives ?? []).join(", ") || "n/a"} · Tipo: ${v.content_type ?? "n/a"}`,
    `Temas: ${(v.main_topics ?? []).join(", ") || "n/a"}`,
    v.concept_summary ? `Análisis: ${v.concept_summary.slice(0, 1500)}` : "",
  ];
  if (withLongForm && v.long_form_breakdown) {
    const b = v.long_form_breakdown as LongFormBreakdown;
    const struct = (b.structure ?? []).map((s) => s?.title).filter(Boolean).join(" → ");
    const parts = [
      b.thesis ? `Tesis: ${b.thesis}` : "",
      struct ? `Estructura: ${struct}` : "",
      b.offer_or_cta ? `Oferta/CTA: ${b.offer_or_cta}` : "",
      (b.retention_tactics ?? []).length ? `Retención: ${(b.retention_tactics ?? []).join("; ")}` : "",
    ].filter(Boolean);
    if (parts.length) lines.push(`Desglose largo — ${parts.join(" | ")}`);
  }
  return lines.filter(Boolean).join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    if (!ANTHROPIC_API_KEY) return json({ error: "ANTHROPIC_API_KEY not configured" }, 500);
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Missing Authorization" }, 401);

    const userClient: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const referent_id = typeof body?.referent_id === "string" ? body.referent_id : null;
    const force = !!body?.force;
    const rawMode = typeof body?.content_mode === "string" ? body.content_mode : "short";
    const content_mode: ContentMode = (["short", "youtube", "combined"] as const).includes(
      rawMode as ContentMode,
    )
      ? (rawMode as ContentMode)
      : "short";
    if (!referent_id) return json({ error: "referent_id is required" }, 400);

    const { data: referent, error: rErr } = await userClient
      .from("referents")
      .select("id, name, owner_id")
      .eq("id", referent_id)
      .single();
    if (rErr || !referent) return json({ error: rErr?.message ?? "Referent not found" }, 404);

    const platforms = PLATFORMS_BY_MODE[content_mode];
    const withLongForm = content_mode === "youtube" || content_mode === "combined";

    // Incremental window: since the last done report OF THE SAME MODE. The
    // combined synthesis always regenerates over everything.
    let since: string | null = null;
    if (!force && content_mode !== "combined") {
      const { data: last } = await userClient
        .from("referent_reports")
        .select("covered_through")
        .eq("referent_id", referent_id)
        .eq("content_mode", content_mode)
        .eq("status", "done")
        .order("covered_through", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      since = last?.covered_through ?? null;
    }

    let vq = userClient
      .from("referent_videos")
      .select(
        "posted_at, platform, views_total, title, video_duration, business_objective, content_objectives, content_type, main_topics, concept_summary, long_form_breakdown",
      )
      .eq("referent_id", referent_id)
      .eq("concept_status", "done")
      .in("platform", platforms)
      .order("posted_at", { ascending: true, nullsFirst: false });
    if (since) vq = vq.gt("posted_at", since);
    const { data: videos, error: vErr } = await vq;
    if (vErr) return json({ error: vErr.message }, 500);

    const rows = (videos ?? []) as VideoRow[];
    if (rows.length === 0) {
      const empty =
        content_mode === "youtube"
          ? "No hay videos de YouTube analizados todavía. Vinculá el canal y analizá su contenido."
          : content_mode === "combined"
            ? "No hay videos analizados todavía para sintetizar."
            : "No hay videos cortos (IG/TikTok) analizados todavía.";
      return json({
        ok: true,
        skipped: true,
        reason: since ? "No hay videos nuevos analizados desde el último informe." : empty,
      });
    }

    const datedRows = rows.filter((v) => v.posted_at);
    const covered_from = since ?? (datedRows[0]?.posted_at ?? null);
    const covered_through = datedRows.length ? datedRows[datedRows.length - 1].posted_at : null;

    // For the combined synthesis, feed the latest short + youtube reports as context.
    let priorContext = "";
    if (content_mode === "combined") {
      const { data: priors } = await userClient
        .from("referent_reports")
        .select("content_mode, markdown, created_at")
        .eq("referent_id", referent_id)
        .in("content_mode", ["short", "youtube"])
        .eq("status", "done")
        .order("created_at", { ascending: false });
      const latestByMode = new Map<string, string>();
      for (const p of priors ?? []) {
        if (p.markdown && !latestByMode.has(p.content_mode)) {
          latestByMode.set(p.content_mode, p.markdown as string);
        }
      }
      const blocks: string[] = [];
      if (latestByMode.get("short")) {
        blocks.push(`### Informe de redes cortas (previo)\n${latestByMode.get("short")}`);
      }
      if (latestByMode.get("youtube")) {
        blocks.push(`### Informe de YouTube (previo)\n${latestByMode.get("youtube")}`);
      }
      if (blocks.length) priorContext = `\n\nINFORMES PREVIOS COMO CONTEXTO:\n\n${blocks.join("\n\n")}`;
    }

    const userMsg = [
      `Referente: ${referent.name}`,
      `Modo: ${MODE_LABEL[content_mode]}`,
      `Videos en esta ventana: ${rows.length}`,
      since ? `(informe incremental: sólo videos posteriores a ${since.slice(0, 10)})` : "(informe completo)",
      "",
      ...rows.map((v, i) => fmtVideo(v, i, withLongForm)),
      priorContext,
    ].join("\n\n");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 4000,
        system: SYSTEM_BY_MODE[content_mode],
        tools: [REPORT_TOOL],
        tool_choice: { type: "tool", name: "emit_strategy_report" },
        messages: [{ role: "user", content: userMsg }],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      return json({ error: `Claude ${res.status}: ${t.slice(0, 500)}` }, 502);
    }
    const data = (await res.json()) as {
      content: Array<{ type: string; name?: string; input?: { report_markdown?: string } }>;
    };
    const toolUse = data.content.find((b) => b.type === "tool_use" && b.name === "emit_strategy_report");
    const markdown = toolUse?.input?.report_markdown
      ? decodeUnicodeEscapes(toolUse.input.report_markdown)
      : null;
    if (!markdown) return json({ error: "Claude did not emit a report" }, 502);

    const now = new Date();
    const period_label = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const { data: report, error: insErr } = await userClient
      .from("referent_reports")
      .insert({
        referent_id,
        owner_id: referent.owner_id,
        content_mode,
        period_label,
        markdown,
        covered_from,
        covered_through,
        video_count: rows.length,
        status: "done",
      })
      .select("id")
      .single();
    if (insErr) return json({ error: `Insert failed: ${insErr.message}` }, 500);

    return json({ ok: true, report_id: report.id, content_mode, video_count: rows.length, period_label });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
