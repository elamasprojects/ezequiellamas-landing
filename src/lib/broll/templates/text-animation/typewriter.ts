/**
 * Typewriter — frase apareciendo letra por letra con cursor blink.
 * JetBrains Mono, white text + accent cursor. Estética técnica, ideal
 * para CLIs, código, statements simples.
 */

import type { BrollContent } from "../../types";
import { FONT_MONO, SLIDE_HEIGHT } from "../../design-tokens";
import { escapeHtml, pickText, pickWords } from "../_shared";

export function renderTypewriter(content: BrollContent): string {
  const text =
    pickText(content.text) ??
    pickText(content.caption) ??
    pickWords(content.words).join(" ") ??
    "Tu mensaje acá";
  // Truncar a algo razonable (no más de 80 chars para 720px width)
  const finalText = text.slice(0, 80);
  // Tamaño tipográfico que escale según largo
  const fontSize =
    finalText.length <= 20 ? 64 :
    finalText.length <= 40 ? 48 :
    finalText.length <= 60 ? 36 :
    28;

  // Splitting por chars para typewriter (cada char en un span propio)
  const charsHtml = [...finalText]
    .map((ch, i) => {
      const display = ch === " " ? "&nbsp;" : escapeHtml(ch);
      return `<span class="tw-char" data-i="${i}">${display}</span>`;
    })
    .join("");

  const label = pickText(content.cueText);
  const labelHtml = label
    ? `<div class="tw-label">${escapeHtml(label)}</div>`
    : "";

  return `
<style>
  .tw-stage {
    position: absolute;
    top: 50%;
    left: 50px;
    right: 50px;
    transform: translateY(-50%);
    text-align: left;
  }
  .tw-prompt {
    display: inline-block;
    font-family: ${FONT_MONO};
    font-size: ${Math.round(fontSize * 0.75)}px;
    font-weight: 500;
    color: var(--accent);
    margin-bottom: 14px;
    letter-spacing: 0.04em;
  }
  .tw-text {
    display: block;
    font-family: ${FONT_MONO};
    font-size: ${fontSize}px;
    font-weight: 500;
    color: var(--text);
    line-height: 1.45;
    letter-spacing: -0.01em;
    word-break: break-word;
  }
  .tw-char { opacity: 0; }
  .tw-cursor {
    display: inline-block;
    width: ${Math.round(fontSize * 0.55)}px;
    height: ${Math.round(fontSize * 1.0)}px;
    background: var(--accent);
    margin-left: ${Math.round(fontSize * 0.06)}px;
    vertical-align: middle;
    transform: translateY(-${Math.round(fontSize * 0.05)}px);
  }
  .tw-label {
    position: absolute;
    bottom: 80px;
    left: 50px;
    right: 50px;
    font-family: ${FONT_MONO};
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0.22em;
    color: rgba(232, 228, 222, 0.4);
    text-transform: uppercase;
  }
</style>

<div class="tw-stage">
  <span class="tw-prompt">$ ezequiel ~</span>
  <div class="tw-text">${charsHtml}<span class="tw-cursor"></span></div>
</div>
${labelHtml}
`;
}

export function durationTypewriter(textLength: number): number {
  // ~30ms por char + 1.5s de hold
  const typeTime = Math.min(2.5, textLength * 0.03);
  return Math.max(3.0, typeTime + 1.8);
}

export function timelineTypewriter(textLength: number): string {
  const typeTime = Math.min(2.5, textLength * 0.03);
  const charStagger = textLength > 0 ? typeTime / textLength : 0.03;
  return `tl.from(".tw-prompt", { opacity: 0, x: -20, duration: 0.4, ease: "power2.out" }, 0);
tl.to(".tw-char", { opacity: 1, duration: 0.01, stagger: ${charStagger.toFixed(4)}, ease: "none" }, 0.4);
tl.to(".tw-cursor", { opacity: 0, duration: 0.4, repeat: -1, yoyo: true, ease: "none" }, 0.4);
tl.from(".tw-label", { opacity: 0, y: 8, duration: 0.4 }, ${(0.4 + typeTime + 0.2).toFixed(2)});
tl.to({}, { duration: 1.2 }, ${(0.4 + typeTime + 0.6).toFixed(2)});`;
}
