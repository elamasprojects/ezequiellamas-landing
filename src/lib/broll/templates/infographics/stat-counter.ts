/**
 * StatCounter — número grande contando hasta el valor final, con label
 * encima en mono uppercase y caption opcional debajo.
 *
 * Content mapping:
 *   - raw.value = number  (ideal — el target final)
 *   - raw.suffix = "x" | "%" | "k" | "M" | "+" (opcional)
 *   - raw.prefix = "$" (opcional)
 *   - text = label arriba (e.g., "FOLLOWERS")
 *   - cueText = caption abajo
 *   - fallback: parsea selected_words[0] como número
 */

import type { BrollContent } from "../../types";
import { FONT_HEADING, FONT_BODY, FONT_MONO } from "../../design-tokens";
import { escapeHtml, pickText, pickWords } from "../_shared";

export function renderStatCounter(content: BrollContent): string {
  const label = pickText(content.text) ?? "Crecimiento";

  // Parse target value
  let target = 0;
  let suffix = "";
  let prefix = "";

  if (content.raw && typeof content.raw === "object") {
    const r = content.raw;
    if (typeof r.value === "number" && Number.isFinite(r.value)) target = r.value;
    if (typeof r.suffix === "string") suffix = r.suffix;
    if (typeof r.prefix === "string") prefix = r.prefix;
  }

  // Fallback: parse words[0]
  if (!target) {
    const words = pickWords(content.words);
    if (words.length > 0) {
      const match = words[0].match(/(-?\d+(?:[.,]\d+)?)([%x+kMK]?)/);
      if (match) {
        target = parseFloat(match[1].replace(",", "."));
        if (match[2]) suffix = match[2];
      }
    }
  }
  if (!target) target = 100;

  const caption = pickText(content.cueText);
  const captionHtml = caption
    ? `<div class="sc-caption">${escapeHtml(caption)}</div>`
    : "";

  // Format target for display
  const formatted = formatNumber(target);
  const fontSize = formatted.length <= 4 ? 220 : formatted.length <= 6 ? 180 : 140;

  return `
<style>
  .sc-label {
    position: absolute;
    top: 240px;
    left: 60px;
    right: 60px;
    text-align: center;
    font-family: ${FONT_MONO};
    font-size: 18px;
    font-weight: 500;
    letter-spacing: 0.28em;
    color: var(--accent);
    text-transform: uppercase;
  }
  .sc-stage {
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    transform: translateY(-55%);
    text-align: center;
  }
  .sc-number {
    display: inline-block;
    font-family: ${FONT_HEADING};
    font-weight: 400;
    color: var(--accent);
    font-style: italic;
    font-size: ${fontSize}px;
    line-height: 1;
    letter-spacing: -0.04em;
    text-shadow: 0 0 60px rgba(200, 255, 0, 0.25);
  }
  .sc-prefix, .sc-suffix {
    display: inline-block;
    font-family: ${FONT_MONO};
    font-weight: 700;
    color: var(--text);
    font-size: ${Math.round(fontSize * 0.42)}px;
    vertical-align: top;
    margin: 0 8px;
    letter-spacing: -0.02em;
  }
  .sc-prefix { transform: translateY(${Math.round(fontSize * 0.18)}px); }
  .sc-suffix { transform: translateY(${Math.round(fontSize * 0.18)}px); }
  .sc-caption {
    position: absolute;
    bottom: 140px;
    left: 60px;
    right: 60px;
    text-align: center;
    font-family: ${FONT_BODY};
    font-size: 22px;
    font-weight: 400;
    color: rgba(232, 228, 222, 0.6);
    line-height: 1.4;
  }
  .sc-rule {
    position: absolute;
    bottom: 110px;
    left: 50%;
    transform: translateX(-50%) scaleX(0);
    transform-origin: center;
    width: 60px;
    height: 2px;
    background: var(--accent);
    opacity: 0.6;
  }
</style>

<div class="sc-label">${escapeHtml(label)}</div>
<div class="sc-stage">
  ${prefix ? `<span class="sc-prefix">${escapeHtml(prefix)}</span>` : ""}<span class="sc-number" data-target="${target}">0</span>${suffix ? `<span class="sc-suffix">${escapeHtml(suffix)}</span>` : ""}
</div>
<div class="sc-rule"></div>
${captionHtml}
`;
}

function formatNumber(n: number): string {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 10_000) return Math.round(n / 1000) + "k";
  if (Math.abs(n) >= 1_000) return n.toLocaleString("es-AR");
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}

export function durationStatCounter(): number {
  return 4.0;
}

export function timelineStatCounter(target: number, hasCaption: boolean): string {
  // GSAP counter: anima un object proxy y on update updatea innerHTML
  return `tl.from(".sc-label", { opacity: 0, y: -10, duration: 0.5 }, 0);
tl.from(".sc-stage", { opacity: 0, scale: 0.85, duration: 0.6, ease: "back.out(1.4)" }, 0.3);
var counter = { v: 0 };
tl.to(counter, {
  v: ${target},
  duration: 1.6,
  ease: "power2.out",
  onUpdate: function() {
    var n = counter.v;
    var s;
    if (Math.abs(n) >= 1000000) s = (n/1000000).toFixed(1) + "M";
    else if (Math.abs(n) >= 10000) s = Math.round(n/1000) + "k";
    else if (Math.abs(n) >= 1000) s = Math.round(n).toLocaleString("es-AR");
    else if (Number.isInteger(${target})) s = Math.round(n).toString();
    else s = n.toFixed(1);
    var el = document.querySelector(".sc-number");
    if (el) el.textContent = s;
  }
}, 0.6);
tl.to(".sc-rule", { scaleX: 1, duration: 0.5, ease: "power2.out" }, 2.0);
${hasCaption ? `tl.from(".sc-caption", { opacity: 0, y: 10, duration: 0.5 }, 2.2);\n` : ""}tl.to({}, { duration: 1.4 }, 2.6);`;
}
