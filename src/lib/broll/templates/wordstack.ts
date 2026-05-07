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
import { FONT_HEADING, FONT_BODY } from "../design-tokens";

/** Escape mínimo HTML para prevenir injection. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Tabla de font-size por cantidad de palabras (en px). */
const WORD_SIZE: Record<number, number> = {
  1: 320,
  2: 280,
  3: 240,
  4: 200,
  5: 170,
  6: 150,
  7: 130,
  8: 115,
};

export function renderWordStack(content: WordStackContent): string {
  const words = (content.words ?? [])
    .filter((w): w is string => typeof w === "string" && w.trim().length > 0)
    .slice(0, 8);
  const count = words.length;
  const cue = content.cueText?.trim() || "";
  const fontSize = WORD_SIZE[count] ?? 200;

  // Cada palabra como <div> (no <span>), absolutamente positionado dentro de
  // un wrapper también absolute. Sin flexbox, sin max-content. Layout 100%
  // determinístico para que Hyperframes no se cuelgue en re-layouts.
  const totalStackHeight = count * fontSize + (count - 1) * 20;
  const startY = (1920 - totalStackHeight) / 2;

  const wordsHtml = words
    .map((w, i) => {
      const top = startY + i * (fontSize + 20);
      return `<div class="ws-word" data-i="${i}" style="top:${top}px">${escapeHtml(w)}</div>`;
    })
    .join("\n  ");

  const cueHtml = cue
    ? `<div class="ws-cue">${escapeHtml(cue)}</div>`
    : "";

  // Fonts inlineadas LITERAL (no var(--*)) para que Hyperframes' regex no las
  // detecte como nombres de font.
  return `
<style>
  .ws-word {
    position: absolute;
    left: 80px;
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
    bottom: 120px;
    left: 80px;
    right: 80px;
    text-align: center;
    font-family: ${FONT_BODY};
    font-size: 36px;
    color: rgba(255, 255, 255, 0.7);
    letter-spacing: 0.02em;
    line-height: 1.3;
  }
</style>

${wordsHtml}
${cueHtml}
`;
}
