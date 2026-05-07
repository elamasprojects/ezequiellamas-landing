/**
 * Sample content por cada template — usado SOLO para previews en la UI
 * (BrollTemplatePreview iframe). Cada template recibe contenido representativo
 * que muestra cómo se ve / mueve.
 *
 * En render real, los brolls usan el content derivado del row de
 * `broll_suggestions` (suggestion, selected_words, cue_text, etc).
 */

import type { BrollContent, BrollTemplate } from "./types";

export const SAMPLE_CONTENT: Record<BrollTemplate, BrollContent> = {
  WordStack: {
    words: ["Construyo", "Negocios", "Que Escalan"],
    cueText: "Sistema, no esfuerzo",
    caption: "EMPRENDEDOR · BUILDER · ARGENTINA",
  },
  Typewriter: {
    text: "El sistema vence al esfuerzo",
    cueText: "@ezequiellamass",
  },
  AcronymReveal: {
    words: ["IA", "Inteligencia", "Artificial"],
    text: "Para emprendedores",
  },
  BoldStatement: {
    text: "Construyo sistemas que",
    words: ["escalan"],
    cueText: "Sin equipo gigante",
  },
  BarGrowth: {
    text: "Tipear vs Dictar",
    raw: {
      bars: [
        { label: "Tipear", value: 15, isAccent: false },
        { label: "Dictar", value: 105, isAccent: true },
      ],
    },
  },
  StatCounter: {
    text: "Followers ganados",
    raw: { value: 12500, suffix: "" },
    cueText: "En 6 meses con sistema",
  },
  BulletList: {
    text: "Lo que aprendí",
    words: [
      "No vender, dar valor masivo",
      "Sistema antes que esfuerzo",
      "Long-game siempre",
    ],
    cueText: "5 años construyendo",
  },
  QuoteCard: {
    text: "El sistema es la diferencia entre estar ocupado y construir algo que escala",
    cueText: "@ezequiellamass",
  },
};
