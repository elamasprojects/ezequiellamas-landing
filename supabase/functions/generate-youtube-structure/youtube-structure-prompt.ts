// (M26) Default editable system prompt + tool for generate-youtube-structure.
// The default is served by get-prompt-defaults under slug "youtube.structure" and
// overridable per owner via prompt_overrides.

export const YOUTUBE_STRUCTURE_DEFAULT =
  `Sos el estructurador de videos largos de YouTube de un creador de marca personal.

Dada una idea (texto o audio transcripto) y una duración objetivo, devolvés la ESTRUCTURA del video, NO un guion palabra por palabra. El creador habla libre dentro de cada sección; vos definís el esqueleto y los puntos.

La estructura SIEMPRE tiene:
1. INTRODUCCIÓN (kind="intro"): por qué el espectador tiene que ver este video, qué información o habilidad se lleva al final, y un resumen breve de lo que se va a ver.
2. DESARROLLO (kind="chapter", varios): cada capítulo cubre un tema concreto, con los PUNTOS a tocar y la mejor forma de presentarlo. NO un guion literal: bullets accionables.
3. CIERRE / CTA (kind="cta"): un accionable o una justificación para ver contenido relacionado a continuación. Long-game (no venta directa).

Reglas:
- Cada sección lleva una duración aproximada (duration_seconds). La suma debe acercarse a la duración objetivo.
- Pensá el video desde el inicio como una colección de clips: cada capítulo debería poder recortarse en piezas de 30-90s para redes.
- Español rioplatense, directo, sin filler. Si recibís el PERFIL DEL CREATOR, usá su voz, su negocio y su audiencia.
- Generá además 5 títulos candidatos (hook-y, concretos, no genéricos, sin clickbait vacío).
- 'points' son bullets (uno por línea), no prosa cerrada.

Devolvés SIEMPRE el resultado vía la tool emit_youtube_structure.`;

export const EMIT_STRUCTURE_TOOL = {
  name: "emit_youtube_structure",
  description: "Devuelve la estructura del video largo + 5 títulos candidatos.",
  input_schema: {
    type: "object",
    properties: {
      titles: {
        type: "array",
        items: { type: "string" },
        minItems: 5,
        maxItems: 5,
        description: "5 títulos candidatos para el video.",
      },
      sections: {
        type: "array",
        minItems: 3,
        description: "Secciones ordenadas: 1 intro, N chapters, 1 cta.",
        items: {
          type: "object",
          properties: {
            kind: { type: "string", enum: ["intro", "chapter", "cta"] },
            title: { type: "string", description: "Título corto de la sección." },
            points: { type: "string", description: "Bullets (uno por línea) de lo que se cubre y cómo presentarlo." },
            duration_seconds: { type: "integer", minimum: 10, description: "Duración aproximada de la sección en segundos." },
          },
          required: ["kind", "title", "points", "duration_seconds"],
        },
      },
    },
    required: ["titles", "sections"],
  },
} as const;

export const LENGTH_TARGET_SECONDS: Record<string, [number, number]> = {
  short: [300, 600], // 5-10 min
  medium: [600, 1200], // 10-20 min
  long: [1200, 2400], // 20-40 min
};

export interface CreatorProfileRow {
  product_service?: string | null;
  target_audience?: string | null;
  long_form_strategy?: string | null;
  who_am_i?: string | null;
  what_i_transmit?: string | null;
}

// Compact creator-profile context block (subset relevant to long-form).
export function buildCreatorProfileBlock(cp: CreatorProfileRow | null | undefined): string {
  if (!cp) return "";
  const lines: string[] = [];
  const add = (label: string, v: string | null | undefined) => {
    const s = (v ?? "").trim();
    if (s) lines.push(`${label}: ${s}`);
  };
  add("QUIÉN SOY", cp.who_am_i);
  add("PRODUCTO/SERVICIO", cp.product_service);
  add("PÚBLICO OBJETIVO", cp.target_audience);
  add("ESTRATEGIA LONG-FORM", cp.long_form_strategy);
  add("QUÉ TRANSMITO", cp.what_i_transmit);
  if (lines.length === 0) return "";
  return ["=== PERFIL DEL CREATOR (contexto base) ===", ...lines].join("\n");
}
