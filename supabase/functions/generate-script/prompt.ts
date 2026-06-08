// Compositor del system prompt para generate-script.
// Lo importa index.ts y lo manda al modelo con cache_control ephemeral
// para amortizar el costo entre llamadas (los 3 inputs estáticos suman ~12-15k tokens).

import { MANIFESTO_BRAND } from "./manifesto.ts";
import { SCRIPTING_RULES } from "./scripting-rules.ts";
import { HOOK_BANK } from "./hook-bank.ts";

const SYSTEM_HEADER = `Sos el guionista de marca personal de Ezequiel Lamas (@ezequiellamass).

Tu trabajo: dado un concepto del usuario (audio transcripto o texto), generar un guion COMPLETO que pase el checklist de marca SIN intervención humana.

Devolvés SIEMPRE el resultado vía la tool 'submit_script'. Nunca contestes con texto plano.

Tenés 3 capas de input estáticas:

1. MANIFIESTO DE MARCA — quién es Ezequiel, su trayectoria, su voz, sus opiniones impopulares concretas, sus referentes (Hormozi/Dalto/Martiell), su estrategia long-game (NO vender directo, ir por valor masivo gratis).
2. REGLAS DE SCRIPTING — framework operativo: estructura Reveal→Build-Up→Value→CTA, 4Ps, 5 content buckets, 3 avatars, anti-tells PROHIBIDOS, modelos mentales, algoritmo, SEO.
3. BANCO DE HOOKS — 149 verbales + 24 visuales para elegir el más apropiado al concepto. Los marcados con ★ son los priorizados para Ezequiel.

Tu output debe respetar las 3 capas: la voz del manifiesto, las reglas del scripting, y un hook concreto del banco.

REGLAS NO NEGOCIABLES:
- Cada guion ataca UN dolor de UN avatar específico (newbie / owner / developer). NUNCA hablás a "todos los emprendedores" en abstracto.
- El CTA NO empuja venta directa de marca personal. Long-game: el CTA pide más valor (segueme, comentá KEYWORD para mandarte X gratis, guardá esto). Solo "explícito directo" cuando ya entregaste valor concreto.
- CERO AI-tells de la lista de PATRONES PROHIBIDOS. Si te tienta escribir "no es X, es Y" o "esto lo cambia todo" — NO LO HAGAS.
- CERO hero's journey de redención emocional. La vulnerabilidad va por errores estratégicos aprendidos, no por "lo difícil que la pasé".
- Voz argentina casual técnica (mirá / dejá de / construilo / dale / posta / el bardo es / te tiro un dato / lo más loco es que / no te volvés loco con / zarpado). Sin filler corporativo. Sin LinkedInerías. Sin emojis decorativos.
- Hashtags 3-7, ESPECÍFICOS (#emprendedor → no; #automatizacionn8n → sí).
- Por lo menos 2 códigos nativos de plataforma sugeridos (match_cuts / jump_cuts / crash_zoom / mixed_media / voice_over / mic_in_hand / cinematic / interview / animated_text / pattern_break).
- Modelo mental SOLO si encaja con el concepto (first_principles / inversion / reverse_engineering / none). No forzarlo.
- Storytelling Setup→Conflict→Resolution SOLO si el guion va por vía narrativa. Si es listicle/tutorial → dejar storytelling en null.

Si el concepto del usuario incluye una transcripción de audio cruda, ignora muletillas y dudas de habla — extraé la idea y dale forma de guion limpio.`;

// Defaults registry keyed by prompt slug. These are the hardcoded fallbacks
// used when the owner has no row in `prompt_overrides` for that slug. The same
// map is served to the client by the `get-prompt-defaults` edge function so the
// "Prompts IA" settings tab shows the real default text and "reset" matches.
export const SCRIPT_PROMPT_DEFAULTS: Record<string, string> = {
  "script.system": SYSTEM_HEADER,
  "script.manifesto": MANIFESTO_BRAND,
  "script.scripting_rules": SCRIPTING_RULES,
  "script.hook_bank": HOOK_BANK,
};

// Composes the static system prompt from the 4 layers, letting an owner override
// any layer. `resolve(slug)` returns the owner's override text or undefined.
export function buildSystemPrompt(
  resolve: (slug: string) => string | undefined,
): string {
  const pick = (slug: string) => resolve(slug) ?? SCRIPT_PROMPT_DEFAULTS[slug];
  return [
    pick("script.system"),
    `=== MANIFIESTO DE MARCA ===\n${pick("script.manifesto")}`,
    `=== REGLAS DE SCRIPTING ===\n${pick("script.scripting_rules")}`,
    `=== BANCO DE HOOKS ===\n${pick("script.hook_bank")}`,
  ].join("\n\n");
}

// Back-compat: the fully-default system prompt (no overrides). Still exported in
// case other callers import it; index.ts now uses buildSystemPrompt().
export const SYSTEM_PROMPT = buildSystemPrompt(() => undefined);

// ---------------------------------------------------------------------------
// Creator profile context block
// ---------------------------------------------------------------------------
// The owner's brand profile + questionnaire (creator_profile row). Emitted as a
// trailing cacheable system block so the model speaks in the configured voice.
// Only populated fields are included; an empty/absent profile yields "" (no block).

export interface CreatorProfileRow {
  product_service?: string | null;
  target_audience?: string | null;
  short_form_strategy?: string | null;
  long_form_strategy?: string | null;
  aspirational_referents?: unknown;
  who_am_i?: string | null;
  my_story?: string | null;
  what_i_transmit?: string | null;
  why_i_create?: string | null;
  desired_impact?: string | null;
  skills_knowledge?: string | null;
}

export function buildCreatorProfileBlock(cp: CreatorProfileRow | null | undefined): string {
  if (!cp) return "";
  const lines: string[] = [];
  const add = (label: string, val: string | null | undefined) => {
    const v = (val ?? "").trim();
    if (v) lines.push(`${label}: ${v}`);
  };

  add("PRODUCTO/SERVICIO", cp.product_service);
  add("PÚBLICO OBJETIVO", cp.target_audience);
  add("ESTRATEGIA SHORT-FORM", cp.short_form_strategy);
  add("ESTRATEGIA LONG-FORM", cp.long_form_strategy);

  const refs = Array.isArray(cp.aspirational_referents)
    ? (cp.aspirational_referents as Array<Record<string, unknown>>)
    : [];
  const refLines = refs
    .map((r) => {
      const name = String(r?.name ?? "").trim();
      const like = String(r?.what_i_like ?? "").trim();
      const why = String(r?.why ?? "").trim();
      if (!name && !like && !why) return null;
      return `  - ${name || "(sin nombre)"}${like ? ` — me gusta: ${like}` : ""}${why ? ` · porque: ${why}` : ""}`;
    })
    .filter((x): x is string => x !== null);
  if (refLines.length) {
    lines.push("REFERENTES ASPIRACIONALES:");
    lines.push(...refLines);
  }

  const q: string[] = [];
  const addQ = (label: string, val: string | null | undefined) => {
    const v = (val ?? "").trim();
    if (v) q.push(`${label}: ${v}`);
  };
  addQ("QUIÉN SOY", cp.who_am_i);
  addQ("MI HISTORIA", cp.my_story);
  addQ("QUÉ TRANSMITO", cp.what_i_transmit);
  addQ("POR QUÉ HAGO CONTENIDO", cp.why_i_create);
  addQ("IMPACTO QUE BUSCO", cp.desired_impact);
  addQ("SKILLS / CONOCIMIENTO / TRAYECTORIA", cp.skills_knowledge);
  if (q.length) {
    lines.push("--- CUESTIONARIO DEL CREATOR ---");
    lines.push(...q);
  }

  if (lines.length === 0) return "";
  return [
    "=== PERFIL DEL CREATOR (contexto base) ===",
    "Usá este perfil como la voz, el ángulo y el contexto de negocio del creador.",
    "Si entra en conflicto con un ejemplo genérico, priorizá este perfil.",
    "",
    ...lines,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Catálogo de motion graphics — formatter
// ---------------------------------------------------------------------------
// Recibe las filas de motion_graphic_templates (system + del owner) y devuelve
// un bloque de texto compacto que se inyecta en el user prompt para que Claude
// elija template_slug + filled_slots correctos.

export interface MotionGraphicTemplateRow {
  slug: string;
  name: string;
  visual: string | null;
  use_for: string[];
  avoid_for: string[];
  narrative_position: string[];
  pillars: string[];
  tone: string[];
  claim_type: string[];
  duration_s: number;
  content_slots: Record<string, unknown>;
}

function compactSlots(slots: Record<string, unknown>): string {
  // Cada slot key con su tipo + max_chars + 1 línea de desc + ejemplo si es string corto.
  // Sub-schemas (keys que arrancan con `_`) se muestran como definiciones aparte al final.
  const lines: string[] = [];
  const subSchemas: string[] = [];
  for (const [key, raw] of Object.entries(slots)) {
    if (typeof raw !== "object" || raw === null) continue;
    const v = raw as Record<string, unknown>;
    if (key.startsWith("_")) {
      // sub-schema
      const subFields = Object.entries(v)
        .map(([k, sv]) => {
          const s = (sv ?? {}) as Record<string, unknown>;
          const t = String(s.type ?? "any");
          const max = s.max_chars ? `<=${s.max_chars}` : "";
          const enums = Array.isArray(s.values) ? ` ${JSON.stringify(s.values)}` : "";
          return `${k}:${t}${max}${enums}`;
        })
        .join(", ");
      subSchemas.push(`  ${key} = { ${subFields} }`);
      continue;
    }
    const type = String(v.type ?? "any");
    const max = v.max_chars ? ` max_chars=${v.max_chars}` : "";
    const desc = v.desc ? ` — ${String(v.desc).slice(0, 80)}` : "";
    const example = v.example !== undefined
      ? ` ej=${typeof v.example === "string" ? JSON.stringify(v.example) : JSON.stringify(v.example).slice(0, 120)}`
      : "";
    lines.push(`    ${key} (${type}${max})${desc}${example}`);
  }
  if (subSchemas.length) {
    lines.push("  --- sub-schemas ---");
    lines.push(...subSchemas);
  }
  return lines.join("\n");
}

export function buildMotionGraphicsCatalogBlock(rows: MotionGraphicTemplateRow[]): string {
  if (!rows || rows.length === 0) {
    return "=== CATÁLOGO DE MOTION GRAPHICS ===\n(catálogo vacío — omití el campo `animations` o devolvelo como [])";
  }
  const sections = rows.map((t) => {
    const meta = [
      `pillars=${t.pillars.join("|")}`,
      `narrative_position=${t.narrative_position.join("|")}`,
      `tone=${t.tone.join("|")}`,
      `claim_type=${t.claim_type.join("|")}`,
      `duration=${t.duration_s}s`,
    ].join(" · ");
    const useFor = t.use_for?.length ? `  USE_FOR: ${t.use_for.map((s) => `"${s}"`).join("; ")}` : "";
    const avoidFor = t.avoid_for?.length ? `  AVOID_FOR: ${t.avoid_for.map((s) => `"${s}"`).join("; ")}` : "";
    const visual = t.visual ? `  VISUAL: ${t.visual}` : "";
    const slots = `  SLOTS:\n${compactSlots(t.content_slots ?? {})}`;
    return [`▸ ${t.slug} — "${t.name}"`, `  ${meta}`, visual, useFor, avoidFor, slots]
      .filter(Boolean)
      .join("\n");
  });
  return [
    "=== CATÁLOGO DE MOTION GRAPHICS ===",
    "Elegí UN template_slug por animación. Rellená filled_slots respetando max_chars.",
    "Reglas duras: NO em-dashes (—), voseo argentino (construilo / dejá / mirá / hacés),",
    "no banned AI patterns ('no es X es Y', 'spoiler:', 'imaginate', 'literalmente').",
    "",
    ...sections,
  ].join("\n");
}

export const SUBMIT_SCRIPT_TOOL = {
  name: "submit_script",
  description:
    "Devuelve el guion completo en formato estructurado. Llamá esta tool exactamente UNA VEZ con todos los campos requeridos.",
  input_schema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "2-6 palabras, hook-y. NO una pregunta. NO genérico.",
      },
      hook: {
        type: "string",
        description:
          "El Reveal (segundos 0-3). <=25 palabras. Argentino casual técnico. Sin AI-tells.",
      },
      hook_alternatives: {
        type: "array",
        description:
          "1-2 versiones alternativas del hook con un ángulo distinto, mismas reglas anti-AI-tell. Para que Ezequiel pueda elegir.",
        items: { type: "string" },
        minItems: 1,
        maxItems: 2,
      },
      hook_reference: {
        type: "string",
        description:
          "Identificador del hook elegido del banco. Formato: 'verbal #N' o 'verbal #N + visual #M'. Ej: 'verbal #82 + visual #13'.",
      },
      visual_hook_format: {
        type: "integer",
        description:
          "Número del hook visual del banco (1-24). Null si no aplica un formato visual específico.",
        minimum: 1,
        maximum: 24,
      },
      development: {
        type: "string",
        description:
          "Build-Up + Value (segundos 3 hasta el final). 60-150 palabras. 2-3 puntos concretos con ejemplos reales (números del UGC Studio cuando encajen). Voz argentina técnica, sin AI-tells.",
      },
      cta: {
        type: "string",
        description:
          "Call-to-action natural (<=20 palabras). Long-game (segueme / comentá KEYWORD / guardá esto). NO venta directa de marca personal. NO 'guarda este post' como muletilla vacía.",
      },
      on_screen_text: {
        type: "string",
        description:
          "Texto en pantalla para el video (líneas tipo Submagic, una por línea). Reforzar keywords SEO. NO repetir literalmente lo que se dice en audio: agregar valor visual o resaltar palabras clave.",
      },
      caption: {
        type: "string",
        description:
          "Caption para IG/TikTok/YT con keywords integradas naturalmente. Termina con los 3-7 hashtags específicos en una línea aparte.",
      },
      hashtags: {
        type: "array",
        description:
          "3-7 hashtags ESPECÍFICOS sin el #. Lowercase alfanumérico (ej: 'automatizacionn8n', 'moneymodel'). Nunca hashtags genéricos como 'emprendedor' o 'negocios'.",
        items: { type: "string" },
        minItems: 3,
        maxItems: 7,
      },
      seo_keywords: {
        type: "array",
        description:
          "5-10 keywords/frases que el algoritmo debería indexar. Específicas al tema del video.",
        items: { type: "string" },
        minItems: 3,
        maxItems: 12,
      },
      animations: {
        type: "array",
        description:
          "Sugerencias de motion graphics editoriales para el guion. Apuntá a UNA cada 10-15 segundos del audio (calculá target_count = floor((word_count / estimated_wpm * 60) / 12)). Cada item elige un template del CATÁLOGO DE MOTION GRAPHICS que se inyecta abajo y rellena sus slots respetando max_chars. Reglas duras del catálogo: NO em-dashes, voseo argentino, sin AI-tells. Si no encontrás un template apropiado para un beat, omitilo en vez de forzarlo.",
        items: {
          type: "object",
          properties: {
            template_slug: {
              type: "string",
              description:
                "Slug exacto del template del catálogo (ej: 'bento.dashboard', 'kinetic.stack'). Debe matchear EXACTO uno de los slugs listados.",
            },
            position: {
              type: "integer",
              minimum: 0,
              description: "Orden cronológico (0, 1, 2, ...) en el guion.",
            },
            start_word_index: {
              type: "integer",
              minimum: 0,
              description:
                "Índice del primer word del guion (concatenado hook + development + cta) donde arranca el motion graphic. 0-indexed.",
            },
            end_word_index: {
              type: "integer",
              minimum: 0,
              description:
                "Índice del último word donde termina (inclusive). Debe ser >= start_word_index.",
            },
            cue_text: {
              type: "string",
              description:
                "La frase exacta del guion (~3-12 palabras) que dispara el motion graphic. Sirve como respaldo del timing si los índices fallan.",
            },
            filled_slots: {
              type: "object",
              description:
                "Objeto con las keys del template elegido (ver content_slots en el catálogo) ya rellenadas. Respetar max_chars de cada slot (truncar si hace falta). Si un slot acepta sub-objetos (metric_card, message, node, etc.) seguir el sub-schema con todas sus keys.",
              additionalProperties: true,
            },
            rationale: {
              type: "string",
              description:
                "Una frase corta (<= 25 palabras) explicando por qué este template encaja en este beat (pillar, narrative_position, claim_type que matcheaste).",
            },
          },
          required: [
            "template_slug",
            "position",
            "start_word_index",
            "end_word_index",
            "cue_text",
            "filled_slots",
          ],
        },
        minItems: 2,
        maxItems: 8,
      },
      why_it_works: {
        type: "string",
        description:
          "1 párrafo (60-100 palabras) explicando la lógica algorítmica + lógica psicológica del guion. Para que Ezequiel entienda por qué funciona, no solo qué dice.",
      },
      content_bucket: {
        type: "string",
        description: "El pilar temático al que pertenece el guion.",
        enum: ["negocios", "sistemas", "ia_estrategica", "finanzas", "mentalidad"],
      },
      avatar_target: {
        type: "string",
        description: "El perfil específico al que ataca el guion.",
        enum: ["newbie", "owner", "developer"],
      },
      mental_model: {
        type: "string",
        description:
          "Modelo mental que se aplica al guion. 'none' si no encaja ninguno. NO forzar.",
        enum: ["first_principles", "inversion", "reverse_engineering", "none"],
      },
      platform_codes: {
        type: "array",
        description:
          "Mínimo 2 códigos nativos de plataforma sugeridos para la edición.",
        items: {
          type: "string",
          enum: [
            "match_cuts",
            "jump_cuts",
            "crash_zoom",
            "mixed_media",
            "voice_over",
            "mic_in_hand",
            "cinematic",
            "interview",
            "animated_text",
            "pattern_break",
          ],
        },
        minItems: 2,
        maxItems: 6,
      },
      storytelling: {
        type: "object",
        description:
          "Si el guion va por vía narrativa, completar Setup → Conflict → Resolution. Si NO es narrativo (listicle, tutorial, opinión), dejar TODOS los campos en string vacío para indicar 'no aplica'.",
        properties: {
          setup: { type: "string" },
          conflict: { type: "string" },
          resolution: { type: "string" },
        },
        required: ["setup", "conflict", "resolution"],
      },
      tone: {
        type: "string",
        enum: [
          "educativo",
          "informal",
          "motivacional",
          "analitico",
          "conversacional",
          "provocador",
        ],
      },
      estimated_wpm: {
        type: "integer",
        minimum: 180,
        maximum: 320,
      },
      ai_summary: {
        type: "string",
        description:
          "1 oración explicando la lógica narrativa del guion para que Ezequiel se ubique de un vistazo en la inbox.",
      },
    },
    required: [
      "title",
      "hook",
      "hook_alternatives",
      "hook_reference",
      "development",
      "cta",
      "on_screen_text",
      "caption",
      "hashtags",
      "seo_keywords",
      "animations",
      "why_it_works",
      "content_bucket",
      "avatar_target",
      "mental_model",
      "platform_codes",
      "storytelling",
      "tone",
      "estimated_wpm",
      "ai_summary",
    ],
  },
} as const;
