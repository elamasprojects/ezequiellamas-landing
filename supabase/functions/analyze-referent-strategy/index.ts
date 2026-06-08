// analyze-referent-strategy — (M24) sintetiza un informe estratégico en Markdown
// de un referente a partir de sus videos ya analizados (concept + clasificación).
// Cubre: estrategia general, mix de objetivos de negocio/contenido, temas, la
// EVOLUCIÓN en el tiempo (§2.7) y la inferencia del NEGOCIO del referente (§2.9).
// Incremental: por default sólo procesa videos posteriores al último informe.

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

interface VideoRow {
  posted_at: string | null;
  platform: string;
  views_total: number | null;
  title: string | null;
  business_objective: string | null;
  content_objectives: string[] | null;
  content_type: string | null;
  main_topics: string[] | null;
  concept_summary: string | null;
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
          "Informe completo en Markdown (con encabezados ##). DEBE incluir, en este orden, secciones: " +
          "'## Resumen estratégico', '## Objetivos de negocio' (mix viralidad/nutrición/conversión con %), " +
          "'## Objetivos y tipos de contenido', '## Temas principales', " +
          "'## Evolución en el tiempo' (qué cambió en temas/formato/estilo, qué dejó de hacer y qué empezó a hacer), " +
          "y '## El negocio del referente' (¿tiene producto propio? ¿qué vende? ¿cómo lo vende? ¿cómo usa el contenido como herramienta de venta?). " +
          "Español rioplatense, denso, accionable, sin filler. Citá números de views cuando sean relevantes.",
      },
    },
    required: ["report_markdown"],
  },
} as const;

const REPORT_SYSTEM =
  `Sos un analista de estrategia de contenido. Te paso el catálogo de videos virales ya analizados de un referente (con su clasificación estratégica y un resumen por video, ordenados por fecha). ` +
  `Tu tarea: producir un informe estratégico completo en Markdown vía la tool emit_strategy_report. ` +
  `Pensá como un estratega que quiere ahorrarle años de prueba y error a otro creador: identificá patrones, qué funcionó y qué no, y cómo evolucionó el referente. ` +
  `Inferí el modelo de negocio a partir de lo que el referente dice y promociona en sus videos. ` +
  `Español rioplatense, denso, sin filler. Nunca digas "imaginate", "te voy a explicar", "spoiler:", "esto lo cambia todo".`;

function fmtVideo(v: VideoRow, i: number): string {
  const date = v.posted_at ? v.posted_at.slice(0, 10) : "s/f";
  return [
    `### Video ${i + 1} — ${date} · ${v.platform} · ${v.views_total ?? "n/a"} views`,
    v.title ? `Título: ${v.title}` : "",
    `Objetivo negocio: ${v.business_objective ?? "n/a"} · Objetivos contenido: ${(v.content_objectives ?? []).join(", ") || "n/a"} · Tipo: ${v.content_type ?? "n/a"}`,
    `Temas: ${(v.main_topics ?? []).join(", ") || "n/a"}`,
    v.concept_summary ? `Análisis: ${v.concept_summary}` : "",
  ].filter(Boolean).join("\n");
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
    if (!referent_id) return json({ error: "referent_id is required" }, 400);

    // Referent (RLS ensures the caller owns it) — for name + owner_id.
    const { data: referent, error: rErr } = await userClient
      .from("referents")
      .select("id, name, owner_id")
      .eq("id", referent_id)
      .single();
    if (rErr || !referent) return json({ error: rErr?.message ?? "Referent not found" }, 404);

    // Incremental window: since the last done report's covered_through (unless force).
    let since: string | null = null;
    if (!force) {
      const { data: last } = await userClient
        .from("referent_reports")
        .select("covered_through")
        .eq("referent_id", referent_id)
        .eq("status", "done")
        .order("covered_through", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      since = last?.covered_through ?? null;
    }

    let vq = userClient
      .from("referent_videos")
      .select(
        "posted_at, platform, views_total, title, business_objective, content_objectives, content_type, main_topics, concept_summary",
      )
      .eq("referent_id", referent_id)
      .eq("concept_status", "done")
      .order("posted_at", { ascending: true, nullsFirst: false });
    if (since) vq = vq.gt("posted_at", since);
    const { data: videos, error: vErr } = await vq;
    if (vErr) return json({ error: vErr.message }, 500);

    const rows = (videos ?? []) as VideoRow[];
    if (rows.length === 0) {
      return json({
        ok: true,
        skipped: true,
        reason: since
          ? "No hay videos nuevos analizados desde el último informe."
          : "No hay videos analizados todavía. Analizá los virales del referente primero.",
      });
    }

    const datedRows = rows.filter((v) => v.posted_at);
    const covered_from = since ?? (datedRows[0]?.posted_at ?? null);
    const covered_through = datedRows.length ? datedRows[datedRows.length - 1].posted_at : null;

    const userMsg = [
      `Referente: ${referent.name}`,
      `Videos analizados en esta ventana: ${rows.length}`,
      since ? `(informe incremental: sólo videos posteriores a ${since.slice(0, 10)})` : "(informe completo)",
      "",
      ...rows.map(fmtVideo),
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
        system: REPORT_SYSTEM,
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

    return json({ ok: true, report_id: report.id, video_count: rows.length, period_label });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
