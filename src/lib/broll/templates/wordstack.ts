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

  const wordsHtml = words
    .map(
      (w, i) =>
        `<span class="ws-word" data-i="${i}">${escapeHtml(w)}</span>`,
    )
    .join("\n        ");

  const cueHtml = cue
    ? `<div class="ws-cue">${escapeHtml(cue)}</div>`
    : "";

  // Pattern del carrusel: <style> inline + <div> con position absolute.
  // El wrapper externo `.ws` está absolutely positioned y centrado en el
  // slide; el stack interno usa flexbox-column SOLO dentro del .ws-stack
  // (no en el direct child del composition wrapper).
  return `
<style>
  .ws {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: max-content;
    max-width: 920px;
  }
  .ws-stack {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
    width: max-content;
  }
  .ws-word {
    font-family: var(--font-heading);
    font-weight: 600;
    color: var(--accent);
    letter-spacing: -0.02em;
    line-height: 1;
    white-space: nowrap;
    font-size: ${fontSize}px;
    text-shadow: 0 0 30px rgba(200, 255, 0, 0.25);
    display: block;
  }
  .ws-cue {
    position: absolute;
    bottom: 120px;
    left: 80px;
    right: 80px;
    text-align: center;
    font-family: var(--font-body);
    font-size: 36px;
    color: rgba(255, 255, 255, 0.7);
    letter-spacing: 0.02em;
    line-height: 1.3;
  }
</style>

<div class="ws">
  <div class="ws-stack">
    ${wordsHtml}
  </div>
</div>
${cueHtml}
`;
}
