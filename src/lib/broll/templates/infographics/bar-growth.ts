/**
 * BarGrowth — barras horizontales creciendo con stagger.
 *
 * Caso real: "tipear vs dictar (7x más rápido)"
 *   ▮▮▮ Tipear        15 wpm
 *   ▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮ Dictar  105 wpm
 *
 * Content mapping:
 *   - raw.bars = [{ label, value, accent? }]  ← ideal
 *   - fallback: words = ["Tipear", "Dictar"], usar values relativos 1:7
 *   - text = title arriba (en mono uppercase)
 */

import type { BrollContent } from "../../types";
import {
  FONT_HEADING,
  FONT_BODY,
  FONT_MONO,
  SLIDE_WIDTH,
} from "../../design-tokens";
import { escapeHtml, pickText, pickWords, pickBars } from "../_shared";

export function renderBarGrowth(content: BrollContent): string {
  const title = pickText(content.text) ?? "Comparación";

  // Try structured bars first; fallback to inferring from words
  let bars = pickBars(content.raw);
  if (!bars) {
    const words = pickWords(content.words).slice(0, 4);
    if (words.length >= 2) {
      // Última barra es "winner" con valor 7x la primera por default
      bars = words.map((label, i) => ({
        label,
        value: i === words.length - 1 ? 7 : 1,
        isAccent: i === words.length - 1,
      }));
    } else {
      bars = [
        { label: "Antes", value: 1, isAccent: false },
        { label: "Después", value: 7, isAccent: true },
      ];
    }
  }

  // Normalizar valores → porcentaje para width (max bar = 90% disponible)
  const maxValue = Math.max(...bars.map((b) => b.value));
  const trackWidth = SLIDE_WIDTH - 120; // 60px padding cada lado

  const barsHtml = bars
    .map((b, i) => {
      const pct = maxValue > 0 ? b.value / maxValue : 0;
      const fillWidth = Math.round(trackWidth * pct);
      const accent = b.isAccent ? " bg-accent" : "";
      return `<div class="bg-row" data-i="${i}">
        <div class="bg-label">${escapeHtml(b.label)}</div>
        <div class="bg-track">
          <div class="bg-fill${accent}" data-target="${fillWidth}" style="width: 0px"></div>
        </div>
        <div class="bg-value${accent}">${formatValue(b.value)}</div>
      </div>`;
    })
    .join("\n  ");

  return `
<style>
  .bg-title {
    position: absolute;
    top: 100px;
    left: 60px;
    right: 60px;
    font-family: ${FONT_MONO};
    font-size: 18px;
    font-weight: 500;
    letter-spacing: 0.22em;
    color: var(--accent);
    text-transform: uppercase;
  }
  .bg-headline {
    position: absolute;
    top: 150px;
    left: 60px;
    right: 60px;
    font-family: ${FONT_HEADING};
    font-size: 56px;
    font-weight: 400;
    color: var(--text);
    line-height: 1.05;
    letter-spacing: -0.02em;
  }
  .bg-bars {
    position: absolute;
    top: 50%;
    left: 60px;
    right: 60px;
    transform: translateY(-30%);
    display: flex;
    flex-direction: column;
    gap: 36px;
  }
  .bg-row {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .bg-label {
    font-family: ${FONT_BODY};
    font-size: 24px;
    font-weight: 500;
    color: rgba(232, 228, 222, 0.85);
  }
  .bg-track {
    position: relative;
    height: 28px;
    background: rgba(232, 228, 222, 0.06);
    border-radius: 14px;
    overflow: hidden;
  }
  .bg-fill {
    position: absolute;
    top: 0; left: 0; bottom: 0;
    background: rgba(232, 228, 222, 0.4);
    border-radius: 14px;
  }
  .bg-fill.bg-accent {
    background: var(--accent);
  }
  .bg-value {
    margin-top: -34px;
    margin-left: 14px;
    font-family: ${FONT_MONO};
    font-size: 16px;
    font-weight: 700;
    color: rgba(232, 228, 222, 0.85);
    align-self: flex-start;
    z-index: 2;
    pointer-events: none;
  }
  .bg-value.bg-accent {
    color: #0a0a0a;
  }
</style>

<div class="bg-title">${escapeHtml(title)}</div>
<div class="bg-bars">
  ${barsHtml}
</div>
`;
}

function formatValue(v: number): string {
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1);
}

export function durationBarGrowth(barCount: number): number {
  return Math.max(3.5, 0.6 + barCount * 0.5 + 1.5);
}

export function timelineBarGrowth(opts: { barCount: number; bars: Array<{ value: number }> }): string {
  // Cada bar anima de 0 a su `data-target` width.
  // Stagger: cada barra empieza 0.4s después de la anterior.
  const stagger = 0.45;
  const fillDur = 0.9;
  const lastEnd = 0.6 + (opts.barCount - 1) * stagger + fillDur;

  // Genera el targeting por width específico via attr (GSAP soporta function-based values)
  return `tl.from(".bg-title", { opacity: 0, y: -10, duration: 0.5, ease: "power2.out" }, 0);
tl.from(".bg-row", { opacity: 0, y: 20, duration: 0.5, stagger: ${stagger}, ease: "power2.out" }, 0.2);
gsap.utils.toArray(".bg-fill").forEach(function(el, i) {
  var target = parseInt(el.getAttribute("data-target"), 10) || 0;
  tl.to(el, { width: target + "px", duration: ${fillDur}, ease: "power3.out" }, 0.4 + i * ${stagger});
});
tl.to({}, { duration: 1.4 }, ${(lastEnd + 0.2).toFixed(2)});`;
}
