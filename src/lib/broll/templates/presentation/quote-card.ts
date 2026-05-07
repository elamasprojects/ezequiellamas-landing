/**
 * QuoteCard — quote en serif italic grande con atribución.
 *
 * Content mapping:
 *   - text = la quote
 *   - cueText = author/source (opcional)
 *   - words[0] = author si cueText vacío
 */

import type { BrollContent } from "../../types";
import { FONT_HEADING, FONT_BODY, FONT_MONO } from "../../design-tokens";
import { escapeHtml, pickText, pickWords } from "../_shared";

export function renderQuoteCard(content: BrollContent): string {
  const quote = pickText(content.text) ?? pickText(content.caption) ?? "El movimiento es la única forma de saber si tenés un negocio";
  const words = pickWords(content.words);
  const author =
    pickText(content.cueText) ??
    (words.length > 0 ? words.join(" ") : null) ??
    "@ezequiellamass";

  const len = quote.length;
  const fontSize =
    len <= 60 ? 56 :
    len <= 100 ? 46 :
    len <= 160 ? 38 :
    32;

  return `
<style>
  .qc-glyph {
    position: absolute;
    top: 110px;
    left: 56px;
    font-family: ${FONT_HEADING};
    font-style: italic;
    font-size: 200px;
    line-height: 0.7;
    color: var(--accent);
    opacity: 0.85;
  }
  .qc-stage {
    position: absolute;
    top: 50%;
    left: 56px;
    right: 56px;
    transform: translateY(-44%);
  }
  .qc-quote {
    font-family: ${FONT_HEADING};
    font-style: italic;
    font-weight: 400;
    color: var(--text);
    font-size: ${fontSize}px;
    line-height: 1.25;
    letter-spacing: -0.015em;
  }
  .qc-attribution {
    position: absolute;
    bottom: 120px;
    left: 56px;
    right: 56px;
    display: flex;
    align-items: center;
    gap: 14px;
    font-family: ${FONT_MONO};
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0.22em;
    color: var(--accent);
    text-transform: uppercase;
  }
  .qc-divider {
    flex: 0 0 auto;
    width: 36px;
    height: 1px;
    background: var(--accent);
    opacity: 0.6;
    transform-origin: left center;
    transform: scaleX(0);
  }
  .qc-bottom-tag {
    position: absolute;
    bottom: 60px;
    left: 56px;
    right: 56px;
    font-family: ${FONT_BODY};
    font-size: 16px;
    font-weight: 400;
    color: rgba(232, 228, 222, 0.35);
    letter-spacing: 0.02em;
  }
</style>

<div class="qc-glyph">"</div>
<div class="qc-stage">
  <div class="qc-quote">${escapeHtml(quote)}</div>
</div>
<div class="qc-attribution">
  <div class="qc-divider"></div>
  <span class="qc-author">${escapeHtml(author)}</span>
</div>
<div class="qc-bottom-tag">ezequiellamas.com</div>
`;
}

export function durationQuoteCard(): number {
  return 4.5;
}

export function timelineQuoteCard(): string {
  return `tl.from(".qc-glyph", { opacity: 0, scale: 0.5, duration: 0.7, ease: "back.out(1.6)" }, 0);
tl.from(".qc-quote", { opacity: 0, y: 24, duration: 0.8, ease: "power3.out" }, 0.4);
tl.to(".qc-divider", { scaleX: 1, duration: 0.5, ease: "power2.out" }, 1.1);
tl.from(".qc-author", { opacity: 0, x: -10, duration: 0.5 }, 1.3);
tl.from(".qc-bottom-tag", { opacity: 0, duration: 0.5 }, 1.6);
tl.to({}, { duration: 1.8 }, 2.4);`;
}
