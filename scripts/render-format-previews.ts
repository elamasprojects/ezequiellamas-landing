/**
 * Pre-renders each carousel format's reference.html to a thumbnail webp,
 * stored under public/carousel-format-previews/<slug>.webp.
 *
 * The thumbnails feed the format selector tiles in /app/admin/carousels/new.
 * Run on demand:
 *
 *   npx tsx scripts/render-format-previews.ts
 *
 * Output is committed to the repo so the SPA does not need a build-time render.
 * Re-run when a reference.html changes.
 */

import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

import { FORMAT_LIST } from "../src/lib/carousel/formats";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const formatsDir = resolve(repoRoot, "src", "lib", "carousel", "formats");
const outDir = resolve(repoRoot, "public", "carousel-format-previews");

const SLIDE_W = 1080;
const SLIDE_H = 1350;
const THUMB_W = 540;
const THUMB_H = Math.round((SLIDE_H * THUMB_W) / SLIDE_W); // 675

mkdirSync(outDir, { recursive: true });

async function main(): Promise<void> {
  const browser = await chromium.launch({
    args: ["--font-render-hinting=none", "--disable-dev-shm-usage", "--disable-gpu"],
  });
  try {
    for (const fmt of FORMAT_LIST) {
      const refPath = resolve(formatsDir, fmt.slug, "reference.html");
      if (!existsSync(refPath)) {
        console.warn(`[skip] ${fmt.slug}: no reference.html at ${refPath}`);
        continue;
      }

      const ctx = await browser.newContext({
        viewport: { width: SLIDE_W, height: SLIDE_H },
        deviceScaleFactor: 1,
      });
      const page = await ctx.newPage();
      try {
        // Load the reference html via file:// so its `<link>` to Google Fonts
        // resolves and any inline images load. Then read fonts.ready before
        // shooting so the thumbnail captures the actual typography.
        const html = readFileSync(refPath, "utf-8");
        await page.setContent(html, {
          waitUntil: "networkidle",
          // file:// base allows relative <link> refs in the reference (rare)
          baseURL: pathToFileURL(refPath).toString(),
        });
        await page.evaluate(() => (document as Document).fonts.ready);
        await page.waitForTimeout(800);

        // Find the .slide element if present, else screenshot the viewport.
        const target = await page.$(".slide");
        const buf = target
          ? await target.screenshot({ type: "png" })
          : await page.screenshot({ type: "png", fullPage: false });

        // Downscale to thumbnail size + convert PNG → WebP using sharp.
        // sharp is already a transitive dep of multiple deps in this repo;
        // if not present at runtime we'll fall back to a 1080×1350 PNG.
        let outBuf: Buffer = buf;
        let ext: "webp" | "png" = "png";
        try {
          const { default: sharp } = await import("sharp");
          outBuf = await sharp(buf)
            .resize(THUMB_W, THUMB_H, { fit: "cover" })
            .webp({ quality: 80, effort: 5 })
            .toBuffer();
          ext = "webp";
        } catch (err) {
          console.warn(
            `[${fmt.slug}] sharp not available, writing 1080x1350 PNG instead. Reason:`,
            err instanceof Error ? err.message : String(err),
          );
        }

        const outPath = resolve(outDir, `${fmt.slug}.${ext}`);
        const fs = await import("node:fs/promises");
        await fs.writeFile(outPath, outBuf);
        console.log(`[ok] ${fmt.slug} -> ${outPath}`);
      } finally {
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("render-format-previews failed:", err);
  process.exitCode = 1;
});
