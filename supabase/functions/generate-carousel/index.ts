// supabase/functions/generate-carousel/index.ts
//
// Generates a 4-8 slide Instagram carousel for @ezequiellamas using Claude Sonnet 4.6
// with tool_use to enforce a strict JSON schema. The system prompt below is the
// FULL source of truth -- v2.2 of the carousel generator brief. If you update the
// brief, you redeploy this function.
//
// Auth: requires authenticated admin (RLS enforced on the inserts via JWT-bound client).
// Body: { concept: string, design_format: string, slide_count?: number, hook_angle?: string, cta_keyword?: string, mode?: 'static'|'animated' }
// Returns: { carousel_id: string, slides: Array<{ index, template, content }> }
//
// `design_format` is the visual system (diario/punk/minimalista/tech/esquemas).
// It is purely visual — Claude's copy is not modulated by it. The renderer
// picks tokens + ornaments from src/lib/carousel/formats/ at draw time.

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

// ============================================================================
// SYSTEM PROMPT v2.2 — single source of truth
// ============================================================================
const SYSTEM_PROMPT_V2 = `# SYSTEM PROMPT v2.2 — Carrousel Generator Ezequiel Lamas

Sos un generador de carruseles de Instagram para **@ezequiellamas**. Recibís un concepto y devolvés 3-10 piezas en formato 4:5 (1080×1350 px), con estilo dark/técnico/anti-guru.

**Output JSON via tool_use:** llamás \`emit_carousel\` con un array de slides. Cada slide es \`{ template, content }\`. Tu trabajo es escribir el copy y elegir templates — el rendering visual se hace después.

---

## 1. INPUT

Recibís un concepto (tema, idea, learning, framework, herramienta, etc.).

**Avanzá sin preguntar** si tenés contexto suficiente. Default 4-8 slides según el contenido.

---

## 2. TEMPLATES disponibles

### T1Cover — siempre slide 1
- \`mascotIcon\`: 1-3 chars o emoji-like (default "$$" o ">_")
- \`headlineLine1\`: sans bold blanco, 1 línea fuerte
- \`headlineLine2Punch\`: serif italic accent (1-3 palabras, signature de la marca)
- \`subtitle\`: 1-2 líneas (markdown allowed: \`**bold**\` para énfasis blanco)
- \`comparisonOld?\`: \`$XX/mes\` strikethrough (opcional, alta-conversión)
- \`comparisonNew?\`: \`$0 con [solución]\` accent pill (opcional)
- \`previewChips?\`: hasta 4 chips mono (categorías de lo que viene)

### T2Feature — single feature/concept (slides 2-5 típico)
- \`partLabel\`: "PARTE 0X" / "DATO 0X" / "TOOL 0X"
- \`iconText?\`: 1-2 chars en mono (mini logo)
- \`title?\`: nombre del concepto/herramienta
- \`priceRow?\`: \`[{ old, new }]\` para comparaciones de precio
- \`contextText?\`: markdown allowed, 1-2 líneas (el dolor)
- \`cardHeader\`: "> LO QUE [...]" en mono accent
- \`cardTitle\`: markdown — envolvé palabra clave en \`*texto*\` para serif punch
- \`cardBullets\`: array de \`{ text, type: 'positive' | 'negative' }\` (4-5 items)

### T3Grid — 4-grid cards 2x2
- \`partLabel\`
- \`headlineMain\`: sans bold blanco (1 línea)
- \`headlineAccent\`: accent o punch (segunda línea)
- \`cards\`: EXACTAMENTE 4 cards. Cada una: \`{ badge, title, description }\`
  - Badges válidos: \`//\`, \`KB\`, \`MD\`, \`$0\`, \`DB\`, \`TX\`, \`%%\`, \`>_\`, \`RD\`
- \`callout\`: cierre con número concreto (markdown allowed)

### T4VS — comparación problema vs solución
- \`partLabel\`
- \`headline\`: 1-2 líneas (markdown allowed)
- \`leftLabel\`: "LO QUE PAGÁS" / "CÓMO LO HACEN" (problema)
- \`leftTitle\`: título corto bold
- \`leftBullets\`: 4-6 items (con x rojos)
- \`leftFooterLines?\`: líneas mono bold al pie (ej. "TOTAL: $X")
- \`rightLabel\`: "[TU APROACH]" en accent (solución)
- \`rightTitlePrefix\`: sans (ej. "Construir")
- \`rightTitlePunch\`: serif italic accent (ej. "lo tuyo")
- \`rightBullets\`: 4-6 items (con > accent)
- \`rightFooterLines?\`

### T5CTA — siempre última slide
- \`headline\`: "COMENTÁ X ABAJO Y TE LO MANDO POR DM" (sans bold blanco, sin markdown)
- \`subtitle\`: 1-2 líneas (markdown allowed)
- \`keyword\`: la palabra que el lector tiene que comentar (becomes giant serif italic, no quotes en el output)
- \`tags\`: EXACTAMENTE 4 tags mono (categorías de lo que el carrusel cubre)
- \`signatureText\`: tagline al pie (markdown allowed)

---

## 3. ESTRUCTURA NARRATIVA

Reveal (slide 1, T1Cover) → Build-Up (slides 2-3) → Value/Detail (slides 4-5) → CTA (última, T5CTA).

Slot recomendados:
- Slide 1: T1Cover
- Slide 2-3: T2Feature o T3Grid (problema, contexto, primer learning)
- Slide 4: T4VS (comparación VS) o T3Grid (los componentes)
- Slide 5: T2Feature (resultado, números)
- Slide 6 (última): T5CTA

Ajustá según el contenido. Carruseles cortos (4 slides) pueden tener: T1Cover → T3Grid → T2Feature → T5CTA.

---

## 4. VOZ Y COPY (no negociable)

### Argentino casual técnico
"dejá de", "construilo", "mirá", "no te volvés loco con", "el bardo es que", "al final del día", "la cuenta no cierra", "no cierra", "corre fuerte"

### Anti-guru
- Nada de "el secreto que cambió mi vida"
- Nada de hype vacío
- Nada de "guarda este post"

### Números concretos (mínimo 2 slides)
\`$30k/mes\`, \`3 meses\`, \`100 clientes\`, \`$0 vs $81/mes\`, \`10 horas/semana\`

### Frase puñal (en \`*texto*\` o \`headlineLine2Punch\` / \`rightTitlePunch\` / \`keyword\`)
El verbo de acción, el resultado, la palabra-bandera. Ejemplos: \`Construilas.\` · \`Tareas, no preguntas.\` · \`Sin pagar.\` · \`Más caro. Más rápido.\` · \`Delegás el camino.\`

NO obligatoria en cada slide — va en cover (sí), CTA (sí), 1-2 slides intermedios donde tengas idea-bandera.

### Cero
- Emojis decorativos
- Frases corporativas
- "en este post te voy a enseñar..."
- "guarda este post"

---

## 5. ANTI-AI-TELLS (FILTRO OBLIGATORIO)

Antes de emitir, pasá CADA slide por este filtro. Si encontrás cualquiera, reescribí.

**Construcciones a eliminar:**
- Antítesis forzada: "no es X, es Y", "no se trata de X, sino de Y"
- Hyperbole genérica: "esto lo cambia todo", "punto de inflexión", "game-changer"
- Gotcha clichés: "el secreto que nadie te cuenta", "la verdad detrás de"
- Devices retóricos vacíos: "spoiler:", "y acá viene lo bueno", "el truco es"
- Aperturas filler: "Imaginate que…", "Pensá esto…", "Te voy a contar…"
- Filler dramático: "La realidad es que…", "La verdad es que…"
- Énfasis robótico: "X. Punto.", "Literalmente.", "Básicamente."
- Em-dashes como pausa dramática constante (— así — interrumpiendo —). Máximo 1 vez por slide.
- Triadas mecánicas: agrupar todo de a 3 "para tener ritmo". Si la lista natural es 4 o 5, dejala así.
- Cierre con pregunta retórica al lector: "¿Y vos qué pensás?", "¿Te animás?". El CTA es directo, no retórico.

**Test rápido:** leélo en voz alta como si lo dijera Ezequiel charlando con un café. Si suena a copy de LinkedIn o a hilo de X de un coach, reescribilo.

---

## 6. MARKDOWN INLINE

En campos donde se permite markdown:
- \`**texto**\` → blanco bold (énfasis)
- \`*texto*\` → serif italic accent + glow (frase puñal inline)

Solo donde está documentado por campo (subtitle, contextText, cardTitle, headline, callout, signatureText). NO en partLabel, badges, tags, keyword.

---

## 7. CHECKLIST FINAL ANTES DE EMITIR

- [ ] Slide 1 es T1Cover, última es T5CTA
- [ ] Frase puñal en cover, CTA, 1-2 intermedias (donde tengas idea bandera)
- [ ] Mínimo 2 slides con números concretos
- [ ] Pasaste el filtro anti-AI-tells (sin antítesis forzada, hyperbole, aperturas filler, em-dashes dramáticos, triadas mecánicas)
- [ ] CTA tiene keyword DM accionable (1 palabra, mayúsculas en el headline pero \`keyword\` field SIN comillas)
- [ ] Cero emojis decorativos
- [ ] Hook NO genérico
- [ ] T3Grid tiene exactamente 4 cards
- [ ] T5CTA tiene exactamente 4 tags
- [ ] Voz Ezequiel: argentino casual técnico

Salida: invocá \`emit_carousel\` con \`slides: [{ template, content }]\`.
`;

// ============================================================================
// JSON Schema for emit_carousel tool — discriminated union per template
// ============================================================================
const SLIDE_SCHEMA = {
  type: "object",
  oneOf: [
    {
      properties: {
        template: { const: "T1Cover" },
        content: {
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
      },
      required: ["template", "content"],
    },
    {
      properties: {
        template: { const: "T2Feature" },
        content: {
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
      },
      required: ["template", "content"],
    },
    {
      properties: {
        template: { const: "T3Grid" },
        content: {
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
      },
      required: ["template", "content"],
    },
    {
      properties: {
        template: { const: "T4VS" },
        content: {
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
      },
      required: ["template", "content"],
    },
    {
      properties: {
        template: { const: "T5CTA" },
        content: {
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
      },
      required: ["template", "content"],
    },
  ],
};

const EMIT_CAROUSEL_TOOL = {
  name: "emit_carousel",
  description:
    "Emit a complete Instagram carousel as an ordered array of slides. The first slide MUST be T1Cover and the last MUST be T5CTA. Slide count between 4 and 8.",
  input_schema: {
    type: "object",
    properties: {
      slides: {
        type: "array",
        minItems: 4,
        maxItems: 8,
        items: SLIDE_SCHEMA,
      },
    },
    required: ["slides"],
  },
};

// ============================================================================
// Types
// ============================================================================
type DesignFormat = "diario" | "punk" | "minimalista" | "tech" | "esquemas";
const DESIGN_FORMATS: ReadonlySet<DesignFormat> = new Set([
  "diario",
  "punk",
  "minimalista",
  "tech",
  "esquemas",
]);

interface RequestBody {
  concept: string;
  design_format?: string;
  slide_count?: number;
  hook_angle?: "problem" | "contrarian" | "data" | "money_model";
  cta_keyword?: string;
  mode?: "static" | "animated";
  carousel_reference_id?: string;
}

interface EmittedSlide {
  template: "T1Cover" | "T2Feature" | "T3Grid" | "T4VS" | "T5CTA";
  content: Record<string, unknown>;
}

// ============================================================================
// Main handler
// ============================================================================
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  if (!ANTHROPIC_API_KEY) {
    return json({ error: "missing_anthropic_api_key" }, 500);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const {
    concept,
    design_format,
    slide_count,
    hook_angle,
    cta_keyword,
    mode = "static",
    carousel_reference_id,
  } = body;
  if (!concept || typeof concept !== "string" || concept.trim().length < 5) {
    return json({ error: "concept_required" }, 400);
  }
  if (!design_format || !DESIGN_FORMATS.has(design_format as DesignFormat)) {
    return json({ error: "design_format_required_or_invalid" }, 400);
  }

  // Auth: bind to caller's JWT so RLS enforces admin
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401);

  const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userResult, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userResult.user) {
    return json({ error: "unauthorized" }, 401);
  }
  const userId = userResult.user.id;

  // Service-role client for atomic inserts that bypass RLS only on internal writes
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // 1) Insert carousel header (status='generating')
  const { data: carouselRow, error: insertErr } = await admin
    .from("carousels")
    .insert({
      owner_id: userId,
      concept: concept.trim(),
      design_format,
      slide_count: slide_count ?? null,
      hook_angle: hook_angle ?? null,
      cta_keyword: cta_keyword?.trim() || null,
      mode,
      status: "generating",
      carousel_reference_id: carousel_reference_id ?? null,
    })
    .select("id")
    .single();
  if (insertErr || !carouselRow) {
    return json({ error: "db_insert_failed", detail: insertErr?.message }, 500);
  }
  const carouselId = carouselRow.id;

  // 2) Build user message
  const userMessage = buildUserMessage({
    concept: concept.trim(),
    slide_count,
    hook_angle,
    cta_keyword,
    mode,
  });

  // 3) Call Claude with tool_use
  let emittedSlides: EmittedSlide[];
  try {
    const slides = await callClaude(userMessage);
    emittedSlides = validateSlides(slides);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await admin
      .from("carousels")
      .update({ status: "error", generation_error: message })
      .eq("id", carouselId);
    return json({ error: "generation_failed", detail: message }, 502);
  }

  // 4) Bulk insert slides
  const slideRows = emittedSlides.map((s, index) => ({
    carousel_id: carouselId,
    owner_id: userId,
    index,
    template: s.template,
    content: s.content,
    render_status: "pending" as const,
  }));
  const { error: slideErr } = await admin.from("carousel_slides").insert(slideRows);
  if (slideErr) {
    await admin
      .from("carousels")
      .update({ status: "error", generation_error: slideErr.message })
      .eq("id", carouselId);
    return json({ error: "db_slides_insert_failed", detail: slideErr.message }, 500);
  }

  // 5) Mark ready, set title from concept
  const inferredTitle = concept.trim().slice(0, 80);
  await admin
    .from("carousels")
    .update({ status: "ready", title: inferredTitle, slide_count: emittedSlides.length })
    .eq("id", carouselId);

  return json({
    carousel_id: carouselId,
    slides: emittedSlides.map((s, index) => ({
      index,
      template: s.template,
      content: s.content,
    })),
  });
});

// ============================================================================
// Helpers
// ============================================================================
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function buildUserMessage(opts: RequestBody): string {
  const lines = [
    `<concept>${opts.concept}</concept>`,
    opts.slide_count ? `<slide_count>${opts.slide_count}</slide_count>` : "",
    opts.hook_angle ? `<hook_angle>${opts.hook_angle}</hook_angle>` : "",
    opts.cta_keyword ? `<cta_keyword>${opts.cta_keyword}</cta_keyword>` : "",
    opts.mode ? `<mode>${opts.mode}</mode>` : "",
    "",
    "Producí el carrusel completo via emit_carousel.",
  ].filter(Boolean);
  return lines.join("\n");
}

async function callClaude(userMessage: string): Promise<EmittedSlide[]> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: SYSTEM_PROMPT_V2,
      tools: [EMIT_CAROUSEL_TOOL],
      tool_choice: { type: "tool", name: "emit_carousel" },
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`anthropic_${res.status}: ${detail.slice(0, 500)}`);
  }
  const data = await res.json();
  const toolUse = data.content?.find(
    (c: { type: string }) => c.type === "tool_use",
  );
  if (!toolUse || !toolUse.input?.slides) {
    throw new Error("no_tool_use_in_response");
  }
  return toolUse.input.slides as EmittedSlide[];
}

function validateSlides(slides: unknown): EmittedSlide[] {
  if (!Array.isArray(slides) || slides.length < 4 || slides.length > 8) {
    throw new Error("invalid_slide_count");
  }
  const first = slides[0] as EmittedSlide;
  const last = slides[slides.length - 1] as EmittedSlide;
  if (first.template !== "T1Cover") throw new Error("first_must_be_T1Cover");
  if (last.template !== "T5CTA") throw new Error("last_must_be_T5CTA");
  for (const s of slides as EmittedSlide[]) {
    if (
      !["T1Cover", "T2Feature", "T3Grid", "T4VS", "T5CTA"].includes(s.template)
    ) {
      throw new Error(`invalid_template: ${s.template}`);
    }
    if (!s.content || typeof s.content !== "object") {
      throw new Error("missing_content");
    }
  }
  return slides as EmittedSlide[];
}
