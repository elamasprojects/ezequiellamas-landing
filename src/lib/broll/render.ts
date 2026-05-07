/**
 * Broll HTML rendering — pure function usada por:
 *   - el render worker (Node + Playwright + Hyperframes)
 *   - eventualmente, un preview iframe en la UI (si lo agregamos)
 *
 * Mirror de `src/lib/carousel/render.ts` con dos diferencias:
 *   - Aspecto 9:16 (1080×1920) en vez de 4:5
 *   - 1 solo template (`WordStack`) en lugar de los 5 de carrusel
 *
 * Output modes:
 *   - "static":  HTML standalone sin GSAP (preview / future PNG snapshot)
 *   - "animated": Hyperframes-compatible con data-composition-id, GSAP local
 *                 y timeline inline. Used SOLO para MP4 renders.
 */

import type { BrollSlide, BrollMode, BrollStyleConfig, BrollTemplate, BrollContent, WordStackContent } from "./types";
import { BASE_BROLL_CSS, SLIDE_WIDTH, SLIDE_HEIGHT, DEFAULTS } from "./design-tokens";
import { renderWordStack } from "./templates/wordstack";
import { timelineWordStack, durationWordStack } from "./animations/wordstack";

/**
 * Returns el body HTML de un slide (sin doctype/head/wrapper).
 * Cuando agreguemos más templates, este switch crece.
 */
export function renderTemplate(template: BrollTemplate, content: BrollContent): string {
  switch (template) {
    case "WordStack":
      return renderWordStack(content as WordStackContent);
  }
}

/**
 * Returns el body GSAP JS de un slide animated.
 * `duration` está en segundos y se inyecta como `data-duration` del wrapper.
 */
export function timelineFor(
  template: BrollTemplate,
  content: BrollContent,
  styleConfig: BrollStyleConfig,
): { js: string; duration: number } {
  switch (template) {
    case "WordStack": {
      const ws = content as WordStackContent;
      const wordCount = Math.min(8, (ws.words ?? []).filter(Boolean).length);
      return {
        js: timelineWordStack({ wordCount, stagger: styleConfig.stagger, ease: styleConfig.ease }),
        duration: durationWordStack(wordCount, styleConfig.stagger),
      };
    }
  }
}

interface BuildBrollOpts {
  outputMode: BrollMode;
  styleConfig: BrollStyleConfig;
}

function tokensToCss(cfg: BrollStyleConfig): string {
  return `:root {
    --bg: ${cfg.bg ?? DEFAULTS.bg};
    --accent: ${cfg.accent ?? DEFAULTS.accent};
    --text: ${DEFAULTS.text};
    --font-heading: ${cfg.fontHeading ?? DEFAULTS.fontHeading};
    --font-body: ${DEFAULTS.fontBody};
  }`;
}

/** Google Fonts link — Instrument Serif (heading) + DM Sans (body). */
function fontsLink(): string {
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">`;
}

/**
 * Build a complete HTML document for a single broll.
 *
 * - outputMode="static":  preview/PNG. Sin GSAP.
 * - outputMode="animated": MP4. Wraps en data-composition-id + GSAP local
 *                         (regla §7 carrusel v2.2: GSAP nunca CDN).
 */
export function buildBrollHtml(slide: BrollSlide, opts: BuildBrollOpts): string {
  const tokensCss = tokensToCss(opts.styleConfig);
  const fonts = fontsLink();
  const body = renderTemplate(slide.template, slide.content);

  if (opts.outputMode === "static") {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${SLIDE_WIDTH}, initial-scale=1">
  <title>B-roll preview</title>
  ${fonts}
  <style>${tokensCss}${BASE_BROLL_CSS}</style>
</head>
<body>
  ${body}
</body>
</html>`;
  }

  // animated mode — Hyperframes
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
  ${fonts}
  <script src="./gsap.min.js"></script>
  <style>${tokensCss}${BASE_BROLL_CSS}
    [data-composition-id]{ position: relative; width: ${SLIDE_WIDTH}px; height: ${SLIDE_HEIGHT}px; overflow: hidden; }
  </style>
</head>
<body>
  <div data-composition-id="broll-1"
       data-width="${SLIDE_WIDTH}" data-height="${SLIDE_HEIGHT}"
       data-start="0" data-duration="${duration}">
    ${body}
    <script>
      (function(){
        if (typeof gsap === "undefined") return;
        var tl = gsap.timeline({ paused: true });
        ${timelineJs}
        window.__timelines = window.__timelines || {};
        window.__timelines["broll-1"] = tl;
      })();
    </script>
  </div>
</body>
</html>`;
}
