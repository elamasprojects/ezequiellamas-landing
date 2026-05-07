/**
 * AcronymReveal — siglas verticales con su definición horizontal.
 *
 * Caso real: CLI = Command Line Interface
 *   C → Command
 *   L → Line
 *   I → Interface
 *
 * Letras en accent serif italic GRANDES, definiciones aparecen al lado en
 * stagger. Estética: poster minimalista técnico.
 *
 * Content mapping:
 *   - words[0] = acronym (e.g., "CLI")
 *   - words[1..] = definitions per letter (e.g., ["Command","Line","Interface"])
 *   - text = caption opcional
 */

import type { BrollContent } from "../../types";
import {
  FONT_HEADING,
  FONT_BODY,
  FONT_MONO,
  SLIDE_HEIGHT,
} from "../../design-tokens";
import { escapeHtml, pickWords, pickText } from "../_shared";

export function renderAcronymReveal(content: BrollContent): string {
  const words = pickWords(content.words);
  const acronym = words[0] ?? "CLI";
  const letters = [...acronym].slice(0, 6); // max 6 letters
  const defs = words.slice(1, 1 + letters.length);

  const caption = pickText(content.text) ?? pickText(content.cueText);

  const letterSize = letters.length <= 3 ? 220 : letters.length <= 4 ? 180 : 140;
  const defSize = letters.length <= 3 ? 56 : letters.length <= 4 ? 48 : 40;
  const lineHeight = Math.round(letterSize * 1.05);
  const totalH = letters.length * lineHeight;
  const startY = Math.max(120, (SLIDE_HEIGHT - totalH) / 2 - 40);

  const rowsHtml = letters
    .map((ch, i) => {
      const top = startY + i * lineHeight;
      const def = defs[i] ?? "";
      const defHtml = def
        ? `<span class="ar-def">${escapeHtml(def)}</span>`
        : "";
      return `<div class="ar-row" style="top:${top}px">
        <span class="ar-letter">${escapeHtml(ch)}</span>
        ${defHtml}
      </div>`;
    })
    .join("\n  ");

  const captionHtml = caption
    ? `<div class="ar-caption">${escapeHtml(caption)}</div>`
    : "";

  return `
<style>
  .ar-row {
    position: absolute;
    left: 60px;
    right: 60px;
    display: flex;
    align-items: baseline;
    gap: 32px;
  }
  .ar-letter {
    flex: 0 0 auto;
    font-family: ${FONT_HEADING};
    font-style: italic;
    font-weight: 400;
    color: var(--accent);
    font-size: ${letterSize}px;
    line-height: 0.85;
    letter-spacing: -0.04em;
    width: ${Math.round(letterSize * 0.7)}px;
  }
  .ar-def {
    flex: 1 1 auto;
    font-family: ${FONT_BODY};
    font-weight: 500;
    color: var(--text);
    font-size: ${defSize}px;
    letter-spacing: -0.01em;
    line-height: 1.05;
    transform-origin: left center;
  }
  .ar-caption {
    position: absolute;
    bottom: 80px;
    left: 60px;
    right: 60px;
    font-family: ${FONT_MONO};
    font-size: 16px;
    font-weight: 500;
    letter-spacing: 0.22em;
    color: rgba(232, 228, 222, 0.5);
    text-transform: uppercase;
  }
</style>

${rowsHtml}
${captionHtml}
`;
}

const LETTER_REVEAL = 0.55;
const STAGGER = 0.22;

export function durationAcronymReveal(letterCount: number): number {
  return Math.max(
    3.5,
    LETTER_REVEAL + (letterCount - 1) * STAGGER + 0.6 + 1.3,
  );
}

export function timelineAcronymReveal(opts: {
  letterCount: number;
  hasCaption: boolean;
}): string {
  const totalLetters = opts.letterCount;
  const lettersEnd = LETTER_REVEAL + (totalLetters - 1) * STAGGER;
  return `tl.from(".ar-letter", {
  opacity: 0,
  scale: 0.4,
  rotation: -8,
  duration: ${LETTER_REVEAL},
  stagger: ${STAGGER},
  ease: "back.out(2)"
}, 0);
tl.from(".ar-def", {
  opacity: 0,
  x: -40,
  duration: 0.45,
  stagger: ${STAGGER},
  ease: "power3.out"
}, 0.25);
${opts.hasCaption ? `tl.from(".ar-caption", { opacity: 0, y: 10, duration: 0.5 }, ${(lettersEnd + 0.2).toFixed(2)});\n` : ""}tl.to({}, { duration: 1.2 }, ${(lettersEnd + 0.5).toFixed(2)});`;
}
