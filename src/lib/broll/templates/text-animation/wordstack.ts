/**
 * WordStack — palabras stackeadas verticales con stagger reveal.
 * Inspiración: el hero de la landing donde "Ezequiel Lamas" tiene
 * "Lamas" en italic accent.
 *
 * Última palabra en italic + accent (la "punch word").
 * Resto en regular Instrument Serif white.
 */

import type { BrollContent, BrollStyleConfig } from "../../types";
import {
  FONT_HEADING,
  FONT_MONO,
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
  DEFAULTS,
} from "../../design-tokens";
import { escapeHtml, pickWords, pickText } from "../_shared";

const WORD_SIZE: Record<number, number> = {
  1: 200,
  2: 168,
  3: 144,
  4: 124,
  5: 108,
  6: 96,
  7: 84,
  8: 76,
};

export function renderWordStack(content: BrollContent): string {
  const words = pickWords(content.words);
  const cue = pickText(content.cueText);
  const count = words.length;
  if (count === 0) {
    // Fallback: derivar palabras del text/caption
    const text = pickText(content.text) ?? pickText(content.caption);
    if (text) {
      const split = text.split(/\s+/).filter(Boolean).slice(0, 4);
      words.push(...split);
    }
  }
  const finalWords = words.length > 0 ? words : ["Tu", "B-roll", "acá"];
  const fontSize = WORD_SIZE[finalWords.length] ?? 124;
  const gap = Math.round(fontSize * 0.18);
  const totalH = finalWords.length * fontSize + (finalWords.length - 1) * gap;
  const startY = Math.max(80, (SLIDE_HEIGHT - totalH) / 2);

  const wordsHtml = finalWords
    .map((w, i) => {
      const isLast = i === finalWords.length - 1;
      const top = startY + i * (fontSize + gap);
      const accentClass = isLast ? " ws-accent" : "";
      return `<div class="ws-word${accentClass}" style="top:${top}px">${escapeHtml(w)}</div>`;
    })
    .join("\n  ");

  const cueHtml = cue
    ? `<div class="ws-cue">${escapeHtml(cue)}</div>`
    : "";

  // Top label decorativo (estilo landing: "EMPRENDEDOR · BUILDER · ARGENTINA")
  const topLabel = pickText(content.caption);
  const labelHtml = topLabel
    ? `<div class="ws-toplabel">${escapeHtml(topLabel)}</div>`
    : "";

  return `
<style>
  .ws-toplabel {
    position: absolute;
    top: 80px;
    left: 60px;
    right: 60px;
    text-align: left;
    font-family: ${FONT_MONO};
    font-size: 16px;
    font-weight: 500;
    letter-spacing: 0.22em;
    color: var(--accent);
    text-transform: uppercase;
  }
  .ws-word {
    position: absolute;
    left: 60px;
    right: 60px;
    font-family: ${FONT_HEADING};
    font-weight: 400;
    color: var(--text);
    letter-spacing: -0.025em;
    line-height: 0.95;
    white-space: nowrap;
    font-size: ${fontSize}px;
  }
  .ws-accent {
    font-style: italic;
    color: var(--accent);
  }
  .ws-cue {
    position: absolute;
    bottom: 80px;
    left: 60px;
    right: 60px;
    font-family: ${DEFAULTS.fontBody};
    font-size: 22px;
    font-weight: 400;
    color: rgba(232, 228, 222, 0.6);
    letter-spacing: 0.01em;
    line-height: 1.4;
  }
</style>

${labelHtml}
${wordsHtml}
${cueHtml}
`;
}

const REVEAL_DUR = 0.6;

export function durationWordStack(wordCount: number, stagger = 0.16): number {
  const revealEnd = REVEAL_DUR + Math.max(0, wordCount - 1) * stagger;
  return Math.max(3.0, revealEnd + 1.4);
}

export function timelineWordStack(opts: {
  wordCount: number;
  stagger?: number;
  ease?: string;
  hasCue: boolean;
  hasLabel: boolean;
}): string {
  const stagger = opts.stagger ?? 0.16;
  const ease = opts.ease ?? "power3.out";
  const revealEnd = REVEAL_DUR + Math.max(0, opts.wordCount - 1) * stagger;

  const labelTween = opts.hasLabel
    ? `tl.from(".ws-toplabel", { opacity: 0, y: -10, duration: 0.5, ease: "power2.out" }, 0);\n`
    : "";

  const wordsTween = `tl.from(".ws-word", {
  opacity: 0,
  y: 60,
  filter: "blur(8px)",
  duration: ${REVEAL_DUR},
  stagger: ${stagger},
  ease: "${ease}"
}, ${opts.hasLabel ? "0.2" : "0"});`;

  const cueTween = opts.hasCue
    ? `\ntl.from(".ws-cue", { opacity: 0, y: 12, duration: 0.5, ease: "power2.out" }, ${(revealEnd + 0.1).toFixed(2)});`
    : "";

  const hold = `\ntl.to({}, { duration: 1.2 }, ${(revealEnd + 0.4).toFixed(2)});`;

  return labelTween + wordsTween + cueTween + hold;
}
