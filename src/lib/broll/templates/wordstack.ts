/**
 * `WordStack` template — emite el body HTML para un broll donde las palabras
 * aparecen stackeadas verticalmente. Mismo patrón estructural que los
 * templates de carrusel (T1Cover, etc): `<style>` inline + `<div>` con
 * position absolute para layout, NUNCA flexbox en hijos del composition
 * wrapper (Hyperframes hace cálculos de layout que pueden colgarse con flex).
 *
 * CRITICAL: las palabras vienen del usuario via `selected_words`. Hay que
 * escapar HTML antes de inyectar.
 */

import type { WordStackContent } from "../types";
import {
  FONT_HEADING,
  FONT_BODY,
  SLIDE_HEIGHT,
} from "../design-tokens";

/** Escape mínimo HTML para prevenir injection. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Tabla de font-size por cantidad de palabras (en px), calibrada para 720×1280. */
const WORD_SIZE: Record<number, number> = {
  1: 213,
  2: 187,
  3: 160,
  4: 133,
  5: 113,
  6: 100,
  7: 87,
  8: 77,
};

const GAP_BETWEEN_WORDS = 14; // px (escalado de 20 a 1080→720)
const SIDE_PADDING = 53; // px (escalado de 80 a 1080→720)
const CUE_BOTTOM = 80; // px

export function renderWordStack(content: WordStackContent): string {
  const words = (content.words ?? [])
    .filter((w): w is string => typeof w === "string" && w.trim().length > 0)
    .slice(0, 8);
  const count = words.length;
  const cue = content.cueText?.trim() || "";
  const fontSize = WORD_SIZE[count] ?? 133;

  const totalStackHeight =
    count * fontSize + Math.max(0, count - 1) * GAP_BETWEEN_WORDS;
  const startY = Math.max(0, (SLIDE_HEIGHT - totalStackHeight) / 2);

  const wordsHtml = words
    .map((w, i) => {
      const top = startY + i * (fontSize + GAP_BETWEEN_WORDS);
      return `<div class="ws-word" data-i="${i}" style="top:${top}px">${escapeHtml(w)}</div>`;
    })
    .join("\n  ");

  const cueHtml = cue
    ? `<div class="ws-cue">${escapeHtml(cue)}</div>`
    : "";

  return `
<style>
  .ws-word {
    position: absolute;
    left: ${SIDE_PADDING}px;
    font-family: ${FONT_HEADING};
    font-weight: 700;
    color: var(--accent);
    letter-spacing: -0.02em;
    line-height: 1;
    white-space: nowrap;
    font-size: ${fontSize}px;
  }
  .ws-cue {
    position: absolute;
    bottom: ${CUE_BOTTOM}px;
    left: ${SIDE_PADDING}px;
    right: ${SIDE_PADDING}px;
    text-align: center;
    font-family: ${FONT_BODY};
    font-size: 24px;
    color: rgba(255, 255, 255, 0.7);
    letter-spacing: 0.02em;
    line-height: 1.3;
  }
</style>

${wordsHtml}
${cueHtml}
`;
}
