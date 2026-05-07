/**
 * Broll HTML rendering — switch sobre los 8 templates organizados en 4
 * categorías. Cada template recibe el mismo `BrollContent` permissive y
 * extrae lo que necesita.
 *
 * Mirror estructural del carrusel `buildSlideHtml`:
 *   - Mismo orden head/body
 *   - Mismo wrapper `<section class="slide">` dentro del data-composition-id
 *   - Mismo formato de timeline injection
 *
 * El worker passes `fontFaces` (los @font-face inline con base64) para que
 * Hyperframes use las brand fonts sin network requests.
 */

import type {
  BrollSlide,
  BrollMode,
  BrollStyleConfig,
  BrollTemplate,
  BrollContent,
} from "./types";
import {
  BASE_BROLL_CSS,
  BRAND,
  SLIDE_WIDTH,
  SLIDE_HEIGHT,
  DEFAULTS,
} from "./design-tokens";
import { pickWords, pickText } from "./templates/_shared";

// Text Animation
import { renderWordStack, durationWordStack, timelineWordStack } from "./templates/text-animation/wordstack";
import { renderTypewriter, durationTypewriter, timelineTypewriter } from "./templates/text-animation/typewriter";

// Posters
import { renderAcronymReveal, durationAcronymReveal, timelineAcronymReveal } from "./templates/posters/acronym-reveal";
import { renderBoldStatement, durationBoldStatement, timelineBoldStatement } from "./templates/posters/bold-statement";

// Infographics
import { renderBarGrowth, durationBarGrowth, timelineBarGrowth } from "./templates/infographics/bar-growth";
import { renderStatCounter, durationStatCounter, timelineStatCounter } from "./templates/infographics/stat-counter";

// Presentation
import { renderBulletList, durationBulletList, timelineBulletList } from "./templates/presentation/bullet-list";
import { renderQuoteCard, durationQuoteCard, timelineQuoteCard } from "./templates/presentation/quote-card";

export function renderTemplate(
  template: BrollTemplate,
  content: BrollContent,
): string {
  switch (template) {
    case "WordStack": return renderWordStack(content);
    case "Typewriter": return renderTypewriter(content);
    case "AcronymReveal": return renderAcronymReveal(content);
    case "BoldStatement": return renderBoldStatement(content);
    case "BarGrowth": return renderBarGrowth(content);
    case "StatCounter": return renderStatCounter(content);
    case "BulletList": return renderBulletList(content);
    case "QuoteCard": return renderQuoteCard(content);
  }
}

export function timelineFor(
  template: BrollTemplate,
  content: BrollContent,
  styleConfig: BrollStyleConfig,
): { js: string; duration: number } {
  switch (template) {
    case "WordStack": {
      const words = pickWords(content.words);
      const wordCount = words.length || 3;
      const hasCue = !!pickText(content.cueText);
      const hasLabel = !!pickText(content.caption);
      return {
        js: timelineWordStack({
          wordCount,
          stagger: styleConfig.stagger,
          ease: styleConfig.ease,
          hasCue,
          hasLabel,
        }),
        duration: durationWordStack(wordCount, styleConfig.stagger),
      };
    }
    case "Typewriter": {
      const text = pickText(content.text) ?? pickText(content.caption) ?? pickWords(content.words).join(" ") ?? "Tu mensaje acá";
      const len = text.slice(0, 80).length;
      return {
        js: timelineTypewriter(len),
        duration: durationTypewriter(len),
      };
    }
    case "AcronymReveal": {
      const words = pickWords(content.words);
      const acronym = words[0] ?? "CLI";
      const letterCount = [...acronym].length;
      return {
        js: timelineAcronymReveal({
          letterCount,
          hasCaption: !!pickText(content.text) || !!pickText(content.cueText),
        }),
        duration: durationAcronymReveal(letterCount),
      };
    }
    case "BoldStatement": {
      const hasSubtitle = !!pickText(content.cueText);
      return {
        js: timelineBoldStatement(hasSubtitle),
        duration: durationBoldStatement(),
      };
    }
    case "BarGrowth": {
      // Need bars count — re-derive same logic as renderBarGrowth
      let barCount = 2;
      const raw = content.raw;
      if (raw && Array.isArray(raw.bars) && raw.bars.length > 0) {
        barCount = Math.min(raw.bars.length, 5);
      } else {
        const words = pickWords(content.words);
        if (words.length >= 2) barCount = Math.min(words.length, 4);
      }
      return {
        js: timelineBarGrowth({
          barCount,
          bars: Array(barCount).fill({ value: 1 }),
        }),
        duration: durationBarGrowth(barCount),
      };
    }
    case "StatCounter": {
      let target = 0;
      if (content.raw && typeof content.raw.value === "number") target = content.raw.value;
      if (!target) {
        const words = pickWords(content.words);
        if (words.length > 0) {
          const m = words[0].match(/(-?\d+(?:[.,]\d+)?)/);
          if (m) target = parseFloat(m[1].replace(",", "."));
        }
      }
      if (!target) target = 100;
      return {
        js: timelineStatCounter(target, !!pickText(content.cueText)),
        duration: durationStatCounter(),
      };
    }
    case "BulletList": {
      const bullets = pickWords(content.words);
      const bulletCount = bullets.length || 3;
      return {
        js: timelineBulletList({
          bulletCount,
          hasSubtitle: !!pickText(content.cueText),
        }),
        duration: durationBulletList(bulletCount),
      };
    }
    case "QuoteCard": {
      return {
        js: timelineQuoteCard(),
        duration: durationQuoteCard(),
      };
    }
  }
}

interface BuildBrollOpts {
  outputMode: BrollMode;
  styleConfig: BrollStyleConfig;
  /** CSS @font-face block (worker injects this con local woff2 base64). */
  fontFaces?: string;
}

function tokensToCss(cfg: BrollStyleConfig): string {
  return `:root {
  --bg: ${cfg.bg ?? DEFAULTS.bg};
  --accent: ${cfg.accent ?? DEFAULTS.accent};
  --secondary: ${cfg.secondary ?? BRAND.warm};
  --text: ${BRAND.text};
}`;
}

export function buildBrollHtml(slide: BrollSlide, opts: BuildBrollOpts): string {
  const tokensCss = tokensToCss(opts.styleConfig);
  const fontFaces = opts.fontFaces ?? "";
  const body = renderTemplate(slide.template, slide.content);

  if (opts.outputMode === "static") {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${SLIDE_WIDTH}, initial-scale=1">
  <title>B-roll preview</title>
  <style>${fontFaces}\n${tokensCss}\n${BASE_BROLL_CSS}</style>
</head>
<body>
  <section class="slide">
    ${body}
  </section>
</body>
</html>`;
  }

  if (opts.outputMode === "preview") {
    // Preview en iframe del web app — auto-play + loop continuo. Usa Google
    // Fonts via <link> (el browser del user puede acceder OK; es solo el
    // Hyperframes Chromium en Railway el que tiene el problema). Y GSAP via
    // jsdelivr para que no haga falta servir gsap.min.js localmente.
    const { js: timelineJs, duration } = timelineFor(
      slide.template,
      slide.content,
      opts.styleConfig,
    );
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${SLIDE_WIDTH}, initial-scale=1">
  <title>B-roll preview</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Instrument+Serif:ital,wght@0,400;1,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.13/dist/gsap.min.js"></script>
  <style>${tokensCss}\n${BASE_BROLL_CSS}
    [data-composition-id]{ position: relative; width: ${SLIDE_WIDTH}px; height: ${SLIDE_HEIGHT}px; overflow: hidden; }
  </style>
</head>
<body>
  <div data-composition-id="slide-1"
       data-width="${SLIDE_WIDTH}" data-height="${SLIDE_HEIGHT}"
       data-start="0" data-duration="${duration}">
    <section class="slide">
      ${body}
    </section>
    <script>
      window.addEventListener("load", function() {
        if (typeof gsap === "undefined") return;
        // Loop continuo con 1s de pausa entre repeticiones.
        var tl = gsap.timeline({ repeat: -1, repeatDelay: 1.0 });
        ${timelineJs}
      });
    </script>
  </div>
</body>
</html>`;
  }

  // animated mode — Hyperframes-compatible
  const { js: timelineJs, duration } = timelineFor(
    slide.template,
    slide.content,
    opts.styleConfig,
  );

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${SLIDE_WIDTH}, initial-scale=1">
  <title>B-roll</title>
  <script src="./gsap.min.js"></script>
  <style>${fontFaces}\n${tokensCss}\n${BASE_BROLL_CSS}
    [data-composition-id]{ position: relative; width: ${SLIDE_WIDTH}px; height: ${SLIDE_HEIGHT}px; overflow: hidden; }
  </style>
</head>
<body>
  <div data-composition-id="slide-1"
       data-width="${SLIDE_WIDTH}" data-height="${SLIDE_HEIGHT}"
       data-start="0" data-duration="${duration}">
    <section class="slide">
      ${body}
    </section>
    <script>
      (function(){
        if (typeof gsap === "undefined") return;
        var tl = gsap.timeline({ paused: true });
        ${timelineJs}
        window.__timelines = window.__timelines || {};
        window.__timelines["slide-1"] = tl;
      })();
    </script>
  </div>
</body>
</html>`;
}
