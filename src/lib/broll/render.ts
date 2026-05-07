/**
 * Broll HTML rendering — pure function usada por:
 *   - el render worker (Node + Playwright + Hyperframes)
 *   - eventualmente, un preview iframe en la UI (si lo agregamos)
 *
 * Mirror estructural EXACTO de `src/lib/carousel/render.ts`:
 *   - Mismo orden de elementos (preconnect → fonts → gsap → style → body)
 *   - Mismo wrapper `<section class="slide">` (no `.broll`) dentro del
 *     composition div para máxima paridad con Hyperframes que ya valida
 *     este pattern en producción
 *   - Mismo formato de timeline injection (paused, asignado a window.__timelines)
 *
 * Diferencias mínimas con carrusel:
 *   - 1080×1920 (9:16) en vez de 1080×1350 (4:5)
 *   - Sin topbar / footer-pill (no aplican a brolls)
 *   - Sin ornaments por design_format (los brolls no tienen formats por ahora)
 */

import type {
  BrollSlide,
  BrollMode,
  BrollStyleConfig,
  BrollTemplate,
  BrollContent,
  WordStackContent,
} from "./types";
import {
  BASE_BROLL_CSS,
  SLIDE_WIDTH,
  SLIDE_HEIGHT,
  DEFAULTS,
} from "./design-tokens";
import { renderWordStack } from "./templates/wordstack";
import { timelineWordStack, durationWordStack } from "./animations/wordstack";

/** Returns el body HTML de un slide (sin doctype/head/wrapper). */
export function renderTemplate(
  template: BrollTemplate,
  content: BrollContent,
): string {
  switch (template) {
    case "WordStack":
      return renderWordStack(content as WordStackContent);
  }
}

/** Returns el body GSAP JS y la duración de la timeline para un template. */
export function timelineFor(
  template: BrollTemplate,
  content: BrollContent,
  styleConfig: BrollStyleConfig,
): { js: string; duration: number } {
  switch (template) {
    case "WordStack": {
      const ws = content as WordStackContent;
      const wordCount = Math.min(
        8,
        (ws.words ?? []).filter(Boolean).length,
      );
      const hasCue = !!(ws.cueText && ws.cueText.trim());
      return {
        js: timelineWordStack({
          wordCount,
          stagger: styleConfig.stagger,
          ease: styleConfig.ease,
          hasCue,
        }),
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

function fontsLink(): string {
  // SIN Google Fonts — usamos fonts del sistema (Georgia para heading, system-ui
  // para body). Hyperframes se cuelga en el frame capture cuando la página
  // tiene `<link>` a fonts CDN que no resuelven o no están en su FONT_ALIASES
  // map. Para fonts custom, hay que embeberlas inline como base64 o instalarlas
  // en el Dockerfile del worker.
  return "";
}

/**
 * Build a complete HTML document for a single broll.
 *
 * - "static":  preview/PNG. Sin GSAP, simple section wrap.
 * - "animated": MP4. Wraps en data-composition-id + GSAP local
 *               (regla §7 carrusel v2.2: GSAP nunca CDN).
 *
 * Mirror EXACTO del orden de elementos del `buildSlideHtml` de carrusel:
 *   <!DOCTYPE html>
 *   <html>
 *   <head>
 *     <meta charset> <meta viewport> <title>
 *     {fonts links}
 *     <script src="./gsap.min.js"></script>     ← solo en animated
 *     <style>{tokens}{base}{composition-rule}</style>
 *   </head>
 *   <body>
 *     <div data-composition-id ...>
 *       <section class="slide">
 *         {body}
 *       </section>
 *       <script>{timeline IIFE}</script>
 *     </div>
 *   </body>
 *   </html>
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
  <section class="slide">
    ${body}
  </section>
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
  ${fonts}
  <script src="./gsap.min.js"></script>
  <style>${tokensCss}${BASE_BROLL_CSS}
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
