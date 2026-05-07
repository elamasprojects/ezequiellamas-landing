/**
 * `WordStack` template — emite el body HTML para un broll donde las palabras
 * aparecen stackeadas verticalmente. Cada palabra se inyecta dentro de un
 * <span class="ws-word"> con `data-words={count}` para que el CSS pueda
 * elegir el font-size correcto según cuántas haya.
 *
 * CRITICAL: las palabras vienen del usuario via `selected_words` en
 * `broll_suggestions`. Hay que escapar HTML antes de inyectar.
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

export function renderWordStack(content: WordStackContent): string {
  const words = (content.words ?? []).filter((w) => w && w.trim().length > 0);
  const count = Math.min(words.length, 8);
  const cue = content.cueText?.trim() || "";

  const wordsHtml = words
    .slice(0, 8)
    .map(
      (w, i) =>
        `<span class="ws-word" data-i="${i}" data-words="${count}">${escapeHtml(w)}</span>`,
    )
    .join("\n      ");

  const cueHtml = cue ? `<div class="ws-cue">${escapeHtml(cue)}</div>` : "";

  return `<section class="broll">
  <div class="ws">
    <div class="ws-stack">
      ${wordsHtml}
    </div>
    ${cueHtml}
  </div>
</section>`;
}
