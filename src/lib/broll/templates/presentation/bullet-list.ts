/**
 * BulletList — title + bullets en stagger reveal.
 * Inspirado en el carrusel pattern §6: bullets con `>` accent prefix.
 *
 * Content mapping:
 *   - text = title arriba (Instrument Serif)
 *   - words[] = bullets (3-5 ideal)
 *   - cueText = subtítulo del title (opcional)
 */

import type { BrollContent } from "../../types";
import { FONT_HEADING, FONT_BODY, FONT_MONO } from "../../design-tokens";
import { escapeHtml, pickText, pickWords } from "../_shared";

export function renderBulletList(content: BrollContent): string {
  const title = pickText(content.text) ?? "Lo que aprendí";
  const subtitle = pickText(content.cueText);
  const bullets = pickWords(content.words);

  const finalBullets = bullets.length > 0
    ? bullets
    : ["Punto uno", "Punto dos", "Punto tres"];

  const bulletSize = finalBullets.length <= 3 ? 38 : finalBullets.length <= 4 ? 32 : 28;
  const gap = finalBullets.length <= 3 ? 32 : 22;

  const bulletsHtml = finalBullets
    .slice(0, 6)
    .map((b, i) =>
      `<li class="bl-bullet" data-i="${i}">
        <span class="bl-prefix">▸</span>
        <span class="bl-text">${escapeHtml(b)}</span>
      </li>`,
    )
    .join("\n  ");

  const subtitleHtml = subtitle
    ? `<div class="bl-subtitle">${escapeHtml(subtitle)}</div>`
    : "";

  return `
<style>
  .bl-tag {
    position: absolute;
    top: 90px;
    left: 56px;
    font-family: ${FONT_MONO};
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0.3em;
    color: var(--accent);
    text-transform: uppercase;
  }
  .bl-tag::before { content: "● "; opacity: 0.6; margin-right: 4px; }
  .bl-title {
    position: absolute;
    top: 150px;
    left: 56px;
    right: 56px;
    font-family: ${FONT_HEADING};
    font-weight: 400;
    font-size: 64px;
    line-height: 1.0;
    letter-spacing: -0.025em;
    color: var(--text);
  }
  .bl-subtitle {
    position: absolute;
    top: 240px;
    left: 56px;
    right: 56px;
    font-family: ${FONT_BODY};
    font-weight: 400;
    font-size: 22px;
    line-height: 1.4;
    color: rgba(232, 228, 222, 0.55);
  }
  .bl-list {
    position: absolute;
    top: ${subtitle ? 320 : 290}px;
    left: 56px;
    right: 56px;
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: ${gap}px;
  }
  .bl-bullet {
    list-style: none;
    display: flex;
    align-items: baseline;
    gap: 18px;
    font-family: ${FONT_BODY};
    font-weight: 500;
    font-size: ${bulletSize}px;
    line-height: 1.3;
    color: var(--text);
  }
  .bl-prefix {
    flex: 0 0 auto;
    color: var(--accent);
    font-weight: 700;
    font-size: ${bulletSize}px;
  }
  .bl-text {
    flex: 1 1 auto;
    letter-spacing: -0.005em;
  }
</style>

<div class="bl-tag">@ezequiellamass</div>
<div class="bl-title">${escapeHtml(title)}</div>
${subtitleHtml}
<ul class="bl-list">
  ${bulletsHtml}
</ul>
`;
}

export function durationBulletList(bulletCount: number): number {
  return Math.max(3.5, 1.0 + bulletCount * 0.25 + 1.5);
}

export function timelineBulletList(opts: {
  bulletCount: number;
  hasSubtitle: boolean;
}): string {
  const stagger = 0.25;
  const lastEnd = 0.8 + (opts.bulletCount - 1) * stagger + 0.5;
  return `tl.from(".bl-tag", { opacity: 0, x: -10, duration: 0.4 }, 0);
tl.from(".bl-title", { opacity: 0, y: 24, duration: 0.6, ease: "power3.out" }, 0.15);
${opts.hasSubtitle ? `tl.from(".bl-subtitle", { opacity: 0, y: 12, duration: 0.5 }, 0.5);\n` : ""}tl.from(".bl-bullet", {
  opacity: 0,
  x: -30,
  duration: 0.5,
  stagger: ${stagger},
  ease: "power3.out"
}, 0.8);
tl.from(".bl-prefix", {
  scale: 0,
  duration: 0.4,
  stagger: ${stagger},
  ease: "back.out(2)"
}, 0.85);
tl.to({}, { duration: 1.4 }, ${(lastEnd + 0.2).toFixed(2)});`;
}
