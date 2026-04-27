/**
 * Visual fidelity test — renders the sample carousel to disk so you can open
 * it in a browser and validate the output against the v2.2 spec.
 *
 * Run with:
 *   npx tsx scripts/render-carousel-test.ts
 *
 * Output:
 *   tmp/carousel-test/index.html        (all 6 slides stacked vertically)
 *   tmp/carousel-test/slide_01.html     (one HTML doc per slide, static mode)
 *   ...
 *   tmp/carousel-test/slide_06.html
 *
 * Then: open tmp/carousel-test/index.html in your browser and validate:
 *   - BG #0A0A0A, accent violet #8B5CF6
 *   - Top bar @ezequiellamas + N/6 in every slide
 *   - Footer "desliza →" pill in slides 1-5, NOT in slide 6
 *   - Frase punal in serif italic accent + glow on cover/T5 CTA
 *   - Bullets do NOT break with <strong> (position:absolute pattern works)
 *   - No emojis, no AI-tells in copy
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { SAMPLE_SLIDES } from "../src/lib/carousel/sample";
import { buildCarouselTestHtml, buildSlideHtml } from "../src/lib/carousel/render";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "..", "tmp", "carousel-test");
mkdirSync(outDir, { recursive: true });

// 1. Stacked-vertical view for visual review
const stacked = buildCarouselTestHtml(SAMPLE_SLIDES);
writeFileSync(resolve(outDir, "index.html"), stacked, "utf-8");

// 2. One static HTML per slide (matches editor iframe srcdoc input)
for (const slide of SAMPLE_SLIDES) {
  const html = buildSlideHtml(slide, {
    totalSlides: SAMPLE_SLIDES.length,
    mode: "static",
    index: slide.index,
    outputMode: "static",
  });
  const n = String(slide.index + 1).padStart(2, "0");
  writeFileSync(resolve(outDir, `slide_${n}.html`), html, "utf-8");
}

console.log(`OK -> ${outDir}`);
console.log(`Open ${resolve(outDir, "index.html")} in your browser to review.`);
