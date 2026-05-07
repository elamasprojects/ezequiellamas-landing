/**
 * BoldStatement — frase punzante en grande con UNA palabra en accent
 * italic. Mismo esquema que el hero de la landing: "Construyo negocios,
 * automatizo procesos y ayudo a emprendedores a [escalar lo que crearon]"
 * donde la última frase está en italic.
 *
 * Content mapping:
 *   - text = la frase completa
 *   - words[0] = la "palabra punch" que va en accent italic
 *     (si falta, usar la última palabra de text)
 *   - cueText = subtítulo abajo (opcional)
 */

import type { BrollContent } from "../../types";
import { FONT_HEADING, FONT_BODY, FONT_MONO } from "../../design-tokens";
import { escapeHtml, pickText, pickWords } from "../_shared";

export function renderBoldStatement(content: BrollContent): string {
  const fullText = pickText(content.text) ?? pickText(content.caption) ?? "Construyo lo imposible";
  const words = pickWords(content.words);
  const subtitle = pickText(content.cueText);

  // Determinar punch word
  let punch = words[0];
  let body = fullText;
  if (punch && fullText.toLowerCase().includes(punch.toLowerCase())) {
    // Si la palabra está en el text, splitearlo
    const re = new RegExp(`\\b${punch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    body = fullText.replace(re, "").replace(/\s{2,}/g, " ").trim();
  } else if (!punch) {
    // Default: última palabra del text
    const splitWords = fullText.split(/\s+/).filter(Boolean);
    punch = splitWords[splitWords.length - 1] ?? "";
    body = splitWords.slice(0, -1).join(" ");
  }

  // Escala según length combinada
  const totalLength = body.length + punch.length;
  const fontSize =
    totalLength <= 25 ? 96 :
    totalLength <= 50 ? 76 :
    totalLength <= 80 ? 60 :
    50;

  const subtitleHtml = subtitle
    ? `<div class="bs-subtitle">${escapeHtml(subtitle)}</div>`
    : "";

  return `
<style>
  .bs-stage {
    position: absolute;
    top: 50%;
    left: 56px;
    right: 56px;
    transform: translateY(-50%);
  }
  .bs-headline {
    font-family: ${FONT_HEADING};
    font-weight: 400;
    color: var(--text);
    font-size: ${fontSize}px;
    line-height: 1.05;
    letter-spacing: -0.022em;
  }
  .bs-punch {
    font-family: ${FONT_HEADING};
    font-style: italic;
    font-weight: 400;
    color: var(--accent);
    font-size: ${fontSize}px;
    letter-spacing: -0.02em;
    display: inline-block;
    position: relative;
  }
  .bs-underline {
    position: absolute;
    left: 0;
    right: 0;
    bottom: -8px;
    height: 4px;
    background: var(--accent);
    transform-origin: left center;
    transform: scaleX(0);
  }
  .bs-subtitle {
    margin-top: 36px;
    font-family: ${FONT_BODY};
    font-weight: 400;
    color: rgba(232, 228, 222, 0.65);
    font-size: 24px;
    line-height: 1.4;
  }
  .bs-corner {
    position: absolute;
    top: 80px;
    left: 60px;
    font-family: ${FONT_MONO};
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0.2em;
    color: var(--accent);
    text-transform: uppercase;
  }
  .bs-corner::before { content: "● "; opacity: 0.6; }
</style>

<div class="bs-corner">@ezequiellamass</div>
<div class="bs-stage">
  <div class="bs-headline">
    <span class="bs-body">${escapeHtml(body)}</span>
    ${punch ? ` <span class="bs-punch">${escapeHtml(punch)}<span class="bs-underline"></span></span>` : ""}
  </div>
  ${subtitleHtml}
</div>
`;
}

export function durationBoldStatement(): number {
  return 4.2;
}

export function timelineBoldStatement(hasSubtitle: boolean): string {
  return `tl.from(".bs-corner", { opacity: 0, x: -10, duration: 0.4 }, 0);
tl.from(".bs-body", { opacity: 0, y: 30, duration: 0.7, ease: "power3.out" }, 0.2);
tl.from(".bs-punch", { opacity: 0, scale: 0.8, duration: 0.6, ease: "back.out(1.6)" }, 0.85);
tl.to(".bs-underline", { scaleX: 1, duration: 0.5, ease: "power3.out" }, 1.4);
${hasSubtitle ? `tl.from(".bs-subtitle", { opacity: 0, y: 12, duration: 0.5 }, 1.7);\n` : ""}tl.to({}, { duration: 1.6 }, 2.2);`;
}
