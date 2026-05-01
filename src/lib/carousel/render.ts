/**
 * Carousel HTML rendering — pure functions used by both:
 *  - the editor's <iframe srcdoc> preview (browser, static mode)
 *  - the render worker (Node + Playwright + Hyperframes)
 *
 * Two output modes:
 *  - "static": produces a standalone HTML page with one <section class="slide">.
 *              No GSAP, no Hyperframes wrapper. Used for previews and PNG renders.
 *  - "animated": produces a Hyperframes-compatible page with `data-composition-id`,
 *              local GSAP, and a per-slide timeline. Used ONLY for MP4 renders.
 *
 * Each slide renders inside a per-carousel `design_format` (Diario / Punk /
 * Minimalista / Tech / Esquemas / …). The format contributes design tokens
 * (colors, font stacks), format-specific CSS, optional ornaments and a
 * Google Fonts URL. The 5 structural templates (T1Cover…T5CTA) read
 * everything via CSS custom properties, so the same slide content paints
 * differently per format with no template duplication.
 */

import type {
  Slide,
  CarouselTemplate,
  CarouselMode,
  RenderOpts,
  T1CoverContent,
  T2FeatureContent,
  T3GridContent,
  T4VSContent,
  T5CTAContent,
} from "./types";
import { BASE_CAROUSEL_CSS, SLIDE_WIDTH, SLIDE_HEIGHT } from "./design-tokens";
import { getFormat, tokensToCssVars, type FormatSlug } from "./formats";
import { renderT1Cover } from "./templates/t1_cover";
import { renderT2Feature } from "./templates/t2_feature";
import { renderT3Grid } from "./templates/t3_grid";
import { renderT4VS } from "./templates/t4_vs";
import { renderT5CTA } from "./templates/t5_cta";
import { timelineT1Cover, DURATION_T1_COVER } from "./animations/t1_cover";
import { timelineT2Feature, DURATION_T2_FEATURE } from "./animations/t2_feature";
import { timelineT3Grid, DURATION_T3_GRID } from "./animations/t3_grid";
import { timelineT4VS, DURATION_T4_VS } from "./animations/t4_vs";
import { timelineT5CTA, DURATION_T5_CTA } from "./animations/t5_cta";

const DEFAULT_HANDLE = "@ezequiellamass";

/**
 * Returns the body HTML for a single slide based on its template.
 * The body excludes the topbar and footer pill -- those are added by the wrapper.
 */
export function renderTemplate(template: CarouselTemplate, content: unknown): string {
  switch (template) {
    case "T1Cover":
      return renderT1Cover(content as T1CoverContent);
    case "T2Feature":
      return renderT2Feature(content as T2FeatureContent);
    case "T3Grid":
      return renderT3Grid(content as T3GridContent);
    case "T4VS":
      return renderT4VS(content as T4VSContent);
    case "T5CTA":
      return renderT5CTA(content as T5CTAContent);
  }
}

/**
 * Returns the GSAP timeline JS body for a slide, used in animated MP4 renders.
 */
export function timelineFor(template: CarouselTemplate): { js: string; duration: number } {
  switch (template) {
    case "T1Cover":
      return { js: timelineT1Cover(), duration: DURATION_T1_COVER };
    case "T2Feature":
      return { js: timelineT2Feature(), duration: DURATION_T2_FEATURE };
    case "T3Grid":
      return { js: timelineT3Grid(), duration: DURATION_T3_GRID };
    case "T4VS":
      return { js: timelineT4VS(), duration: DURATION_T4_VS };
    case "T5CTA":
      return { js: timelineT5CTA(), duration: DURATION_T5_CTA };
  }
}

interface BuildSlideOpts extends RenderOpts {
  index: number;          // 0-based slide index
  outputMode: CarouselMode; // "static" or "animated" (final output target)
  format: FormatSlug;     // design system to apply (e.g. "diario", "punk", …)
}

function fontsLink(href: string): string {
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${href}" rel="stylesheet">`;
}

/**
 * Build a complete HTML document for a single slide.
 *
 * - outputMode="static": for previews and PNG renders. No GSAP, simple section wrap.
 * - outputMode="animated": for MP4 renders. Wraps in Hyperframes data-composition-id
 *   and includes <script src="./gsap.min.js"> (LOCAL, not CDN -- v2.2 §7 critical rule).
 */
export function buildSlideHtml(slide: Slide, opts: BuildSlideOpts): string {
  const { totalSlides, mode: _mode, handle = DEFAULT_HANDLE, index, outputMode, format } = opts;
  const isLast = index === totalSlides - 1;
  const slideNumber = index + 1;

  const fmt = getFormat(format);
  const tokensCss = tokensToCssVars(format);
  const formatCss = fmt.css;
  const ornaments = fmt.ornaments;
  const fonts = fontsLink(fmt.fontsUrl);

  const body = renderTemplate(slide.template, slide.content);
  const topbar = `
    <header class="topbar">
      <span>${handle}</span>
      <span>${slideNumber}/${totalSlides}</span>
    </header>
  `;
  const footer = isLast ? "" : `<div class="footer-pill">desliza &rarr;</div>`;

  if (outputMode === "static") {
    return `<!DOCTYPE html>
<html lang="es" data-format="${format}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${SLIDE_WIDTH}, initial-scale=1">
  <title>Slide ${slideNumber}</title>
  ${fonts}
  <style>${tokensCss}${BASE_CAROUSEL_CSS}${formatCss}</style>
</head>
<body>
  <section class="slide">
    ${ornaments}
    ${topbar}
    ${body}
    ${footer}
  </section>
</body>
</html>`;
  }

  // animated mode -- Hyperframes-compatible
  const { js: timelineJs, duration } = timelineFor(slide.template);

  return `<!DOCTYPE html>
<html lang="es" data-format="${format}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${SLIDE_WIDTH}, initial-scale=1">
  <title>Slide ${slideNumber}</title>
  ${fonts}
  <script src="./gsap.min.js"></script>
  <style>${tokensCss}${BASE_CAROUSEL_CSS}${formatCss}
    [data-composition-id]{ position: relative; width: ${SLIDE_WIDTH}px; height: ${SLIDE_HEIGHT}px; overflow: hidden; }
  </style>
</head>
<body>
  <div data-composition-id="slide-${slideNumber}"
       data-width="${SLIDE_WIDTH}" data-height="${SLIDE_HEIGHT}"
       data-start="0" data-duration="${duration}">
    <section class="slide">
      ${ornaments}
      ${topbar}
      ${body}
      ${footer}
    </section>
    <script>
      (function(){
        if (typeof gsap === "undefined") return;
        var tl = gsap.timeline({ paused: true });
        ${timelineJs}
        window.__timelines = window.__timelines || {};
        window.__timelines["slide-${slideNumber}"] = tl;
      })();
    </script>
  </div>
</body>
</html>`;
}

/**
 * Build a single HTML page with ALL slides stacked vertically for visual fidelity tests.
 * Each slide is wrapped in a <section class="slide"> at native 1080x1350.
 * Useful for: dev visual review, side-by-side spec compliance check.
 */
export function buildCarouselTestHtml(
  slides: Slide[],
  format: FormatSlug,
  handle = DEFAULT_HANDLE,
): string {
  const total = slides.length;
  const fmt = getFormat(format);
  const tokensCss = tokensToCssVars(format);
  const fonts = fontsLink(fmt.fontsUrl);

  const sections = slides
    .map((s, i) => {
      const body = renderTemplate(s.template, s.content);
      const isLast = i === total - 1;
      const slideNumber = i + 1;
      return `
        <section class="slide">
          ${fmt.ornaments}
          <header class="topbar">
            <span>${handle}</span>
            <span>${slideNumber}/${total}</span>
          </header>
          ${body}
          ${isLast ? "" : `<div class="footer-pill">desliza &rarr;</div>`}
        </section>
      `;
    })
    .join('<div class="slide-gap"></div>');

  return `<!DOCTYPE html>
<html lang="es" data-format="${format}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${SLIDE_WIDTH}, initial-scale=1">
  <title>Carousel test — ${total} slides</title>
  ${fonts}
  <style>${tokensCss}${BASE_CAROUSEL_CSS}${fmt.css}
    html, body { width: auto; height: auto; }
    body { padding: 40px; background: #1a1a1a; }
    .slide-gap { height: 40px; }
  </style>
</head>
<body>
  ${sections}
</body>
</html>`;
}
