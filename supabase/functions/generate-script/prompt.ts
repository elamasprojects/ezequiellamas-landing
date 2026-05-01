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

export const SYSTEM_PROMPT = [
  SYSTEM_HEADER,
  `=== MANIFIESTO DE MARCA ===\n${MANIFESTO_BRAND}`,
  `=== REGLAS DE SCRIPTING ===\n${SCRIPTING_RULES}`,
  `=== BANCO DE HOOKS ===\n${HOOK_BANK}`,
].join("\n\n");

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
      brolls: {
        type: "array",
        description:
          "3-5 sugerencias de B-roll concretas, atadas a líneas específicas del guion.",
        items: {
          type: "object",
          properties: {
            position: { type: "integer", minimum: 0 },
            cue_text: {
              type: "string",
              description:
                "La línea exacta del guion donde el B-roll arranca.",
            },
            suggestion: {
              type: "string",
              description: "Qué se muestra en pantalla (concreto, ejecutable).",
            },
          },
          required: ["position", "suggestion"],
        },
        minItems: 3,
        maxItems: 5,
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
      "brolls",
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
