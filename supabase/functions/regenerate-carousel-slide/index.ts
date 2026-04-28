// supabase/functions/regenerate-carousel-slide/index.ts
//
// Regenerates ONE slide while keeping the rest of the carousel as context.
// Pins the slide template -- only copy gets regenerated.
//
// Body: { carousel_id: string, slide_index: number, instruction?: string }
// Returns: { template, content }   (caller persists the UPDATE)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

const SYSTEM_PROMPT = `Sos el generador de carruseles de Ezequiel Lamas (v2.2).

Te paso UN slide para regenerar manteniendo el template fijo. Tu trabajo:
- Leer el contexto completo del carrusel (las otras slides)
- Reescribir el contenido del slide pedido respetando la narrativa, voz argentina casual técnica, anti-AI-tells
- Mantener el template original (no podés cambiarlo)
- Aplicar las instrucciones extra del usuario si las hay

Voz Ezequiel: "dejá de", "construilo", "mirá", "el bardo es que", "no te volvés loco con", "al final del día", "la cuenta no cierra".

Anti-AI-tells PROHIBIDOS:
- Antítesis forzada ("no es X, es Y")
- Hyperbole genérica ("game-changer", "punto de inflexión")
- Aperturas filler ("Imaginate que...", "Te voy a contar...")
- Em-dashes dramáticos repetidos
- Triadas mecánicas
- Cierre con pregunta retórica

Markdown inline:
- \`**texto**\` -> bold blanco
- \`*texto*\` -> serif italic accent + glow (frase puñal)

Salida: invocá \`emit_slide\` con \`{ template, content }\`. El template DEBE coincidir con el original.`;

// Same per-template content schemas as generate-carousel (compact inline)
const TEMPLATE_CONTENT_SCHEMAS: Record<string, unknown> = {
  T1Cover: {
    type: "object",
    properties: {
      mascotIcon: { type: "string", maxLength: 6 },
      headlineLine1: { type: "string", maxLength: 80 },
      headlineLine2Punch: { type: "string", maxLength: 40 },
      subtitle: { type: "string", maxLength: 280 },
      comparisonOld: { type: "string", maxLength: 60 },
      comparisonNew: { type: "string", maxLength: 60 },
      previewChips: {
        type: "array",
        items: { type: "string", maxLength: 24 },
        maxItems: 4,
      },
    },
    required: ["headlineLine1", "headlineLine2Punch", "subtitle"],
  },
  T2Feature: {
    type: "object",
    properties: {
      partLabel: { type: "string", maxLength: 24 },
      iconText: { type: "string", maxLength: 4 },
      title: { type: "string", maxLength: 60 },
      priceRow: {
        type: "array",
        items: {
          type: "object",
          properties: {
            old: { type: "string", maxLength: 30 },
            new: { type: "string", maxLength: 30 },
          },
          required: ["old", "new"],
        },
        maxItems: 3,
      },
      contextText: { type: "string", maxLength: 280 },
      cardHeader: { type: "string", maxLength: 50 },
      cardTitle: { type: "string", maxLength: 120 },
      cardBullets: {
        type: "array",
        items: {
          type: "object",
          properties: {
            text: { type: "string", maxLength: 140 },
            type: { enum: ["positive", "negative"] },
          },
          required: ["text", "type"],
        },
        minItems: 3,
        maxItems: 6,
      },
    },
    required: ["partLabel", "cardHeader", "cardTitle", "cardBullets"],
  },
  T3Grid: {
    type: "object",
    properties: {
      partLabel: { type: "string", maxLength: 24 },
      headlineMain: { type: "string", maxLength: 80 },
      headlineAccent: { type: "string", maxLength: 80 },
      cards: {
        type: "array",
        items: {
          type: "object",
          properties: {
            badge: { type: "string", maxLength: 6 },
            title: { type: "string", maxLength: 60 },
            description: { type: "string", maxLength: 140 },
          },
          required: ["badge", "title", "description"],
        },
        minItems: 4,
        maxItems: 4,
      },
      callout: { type: "string", maxLength: 200 },
    },
    required: [
      "partLabel",
      "headlineMain",
      "headlineAccent",
      "cards",
      "callout",
    ],
  },
  T4VS: {
    type: "object",
    properties: {
      partLabel: { type: "string", maxLength: 24 },
      headline: { type: "string", maxLength: 160 },
      leftLabel: { type: "string", maxLength: 30 },
      leftTitle: { type: "string", maxLength: 60 },
      leftBullets: {
        type: "array",
        items: { type: "string", maxLength: 80 },
        minItems: 3,
        maxItems: 6,
      },
      leftFooterLines: {
        type: "array",
        items: { type: "string", maxLength: 50 },
        maxItems: 3,
      },
      rightLabel: { type: "string", maxLength: 30 },
      rightTitlePrefix: { type: "string", maxLength: 40 },
      rightTitlePunch: { type: "string", maxLength: 40 },
      rightBullets: {
        type: "array",
        items: { type: "string", maxLength: 80 },
        minItems: 3,
        maxItems: 6,
      },
      rightFooterLines: {
        type: "array",
        items: { type: "string", maxLength: 50 },
        maxItems: 3,
      },
    },
    required: [
      "partLabel",
      "headline",
      "leftLabel",
      "leftTitle",
      "leftBullets",
      "rightLabel",
      "rightTitlePrefix",
      "rightTitlePunch",
      "rightBullets",
    ],
  },
  T5CTA: {
    type: "object",
    properties: {
      headline: { type: "string", maxLength: 100 },
      subtitle: { type: "string", maxLength: 240 },
      keyword: { type: "string", maxLength: 20 },
      tags: {
        type: "array",
        items: { type: "string", maxLength: 16 },
        minItems: 4,
        maxItems: 4,
      },
      signatureText: { type: "string", maxLength: 120 },
    },
    required: ["headline", "subtitle", "keyword", "tags", "signatureText"],
  },
};

interface RequestBody {
  carousel_id: string;
  slide_index: number;
  instruction?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!ANTHROPIC_API_KEY) {
    return json({ error: "missing_anthropic_api_key" }, 500);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const { carousel_id, slide_index, instruction } = body;
  if (!carousel_id || typeof slide_index !== "number") {
    return json({ error: "missing_args" }, 400);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401);

  // JWT-bound client -- RLS will filter to caller's carousel only
  const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  // 1) Load all slides for narrative context (RLS scopes to owner)
  const { data: slides, error: loadErr } = await userClient
    .from("carousel_slides")
    .select("index, template, content")
    .eq("carousel_id", carousel_id)
    .order("index", { ascending: true });
  if (loadErr) return json({ error: "load_failed", detail: loadErr.message }, 500);
  if (!slides || slides.length === 0) {
    return json({ error: "carousel_not_found" }, 404);
  }
  const target = slides.find((s) => s.index === slide_index);
  if (!target) return json({ error: "slide_index_out_of_range" }, 404);

  const targetTemplate = target.template as keyof typeof TEMPLATE_CONTENT_SCHEMAS;
  const contentSchema = TEMPLATE_CONTENT_SCHEMAS[targetTemplate];
  if (!contentSchema) {
    return json({ error: "unknown_template" }, 500);
  }

  // 2) Build context message
  const carouselContext = slides
    .map(
      (s) =>
        `<slide index="${s.index}" template="${s.template}"${s.index === slide_index ? ' role="target"' : ""}>\n${JSON.stringify(s.content, null, 2)}\n</slide>`,
    )
    .join("\n");

  const userMessage = `<carousel_context>
${carouselContext}
</carousel_context>

<task>Regenera el slide en index=${slide_index} (template ${targetTemplate}).${instruction ? `\n\nInstrucciones extra del usuario: ${instruction}` : ""}</task>

Salida: emit_slide con { template: "${targetTemplate}", content: <reescrito> }.`;

  const tool = {
    name: "emit_slide",
    description: `Emit a single regenerated slide. The template MUST be "${targetTemplate}".`,
    input_schema: {
      type: "object",
      properties: {
        template: { const: targetTemplate },
        content: contentSchema,
      },
      required: ["template", "content"],
    },
  };

  // 3) Call Claude
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [tool],
      tool_choice: { type: "tool", name: "emit_slide" },
      messages: [{ role: "user", content: userMessage }],
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    return json(
      { error: "anthropic_error", detail: detail.slice(0, 500) },
      502,
    );
  }
  const data = await res.json();
  const toolUse = data.content?.find(
    (c: { type: string }) => c.type === "tool_use",
  );
  if (!toolUse || !toolUse.input?.content) {
    return json({ error: "no_tool_use_in_response" }, 502);
  }
  if (toolUse.input.template !== targetTemplate) {
    return json({ error: "template_mismatch" }, 502);
  }

  return json({
    template: targetTemplate,
    content: decodeUnicodeEscapes(toolUse.input.content),
  });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
