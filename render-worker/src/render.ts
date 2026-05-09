// Per-slide / per-broll rendering: PNG via Playwright, MP4 via Hyperframes.

import { chromium, type Browser } from "playwright";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, readFile, readdir, rm, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { buildSlideHtml } from "../../src/lib/carousel/render";
import type { Slide } from "../../src/lib/carousel/types";
import type { FormatSlug } from "../../src/lib/carousel/formats";
import { buildBrollHtml } from "../../src/lib/broll/render";
import type { BrollTemplate, BrollContent, BrollStyleConfig } from "../../src/lib/broll/types";
import { brandFontFaces } from "./fonts.js";
import { buildMotionGraphicHtml } from "../../src/lib/motion-graphics/shell";
import { renderTemplate } from "../../src/lib/motion-graphics/templates";

const SLIDE_W = 1080;
const SLIDE_H = 1350;
const HYPERFRAMES_TIMEOUT_MS = 5 * 60 * 1000; // 5 min hard cap per slide

// Lazily-initialized singleton browser. Reusing the browser across renders
// saves ~300-500ms per slide vs. relaunching.
let browserPromise: Promise<Browser> | null = null;
function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      args: [
        "--font-render-hinting=none",
        "--disable-dev-shm-usage", // critical for Docker (small /dev/shm)
        "--disable-gpu",
      ],
    });
  }
  return browserPromise;
}

export async function shutdownBrowser(): Promise<void> {
  if (browserPromise) {
    const b = await browserPromise;
    await b.close();
    browserPromise = null;
  }
}

export async function renderPng(opts: {
  slide: Slide;
  totalSlides: number;
  design_format: FormatSlug;
}): Promise<Buffer> {
  const html = buildSlideHtml(opts.slide, {
    totalSlides: opts.totalSlides,
    mode: "static",
    index: opts.slide.index,
    outputMode: "static",
    format: opts.design_format,
  });

  const browser = await getBrowser();
  const ctx = await browser.newContext({
    viewport: { width: SLIDE_W, height: SLIDE_H },
    deviceScaleFactor: 2, // 2x retina
  });
  const page = await ctx.newPage();
  try {
    await page.setContent(html, { waitUntil: "networkidle" });
    // Make sure all webfonts have actually loaded -- otherwise the screenshot
    // catches a fallback font flash. Runs inside the browser via page.evaluate;
    // tsconfig doesn't include DOM lib so we cast through unknown.
    await page.evaluate(
      () =>
        (
          (globalThis as unknown as { document: { fonts: { ready: Promise<void> } } })
            .document.fonts.ready
        ),
    );
    await page.waitForTimeout(800); // settle paint

    const buf = await page.screenshot({ type: "png", fullPage: false });
    return buf;
  } finally {
    await ctx.close();
  }
}

export async function renderMp4(opts: {
  slide: Slide;
  totalSlides: number;
  design_format: FormatSlug;
}): Promise<Buffer> {
  const html = buildSlideHtml(opts.slide, {
    totalSlides: opts.totalSlides,
    mode: "animated",
    index: opts.slide.index,
    outputMode: "animated",
    format: opts.design_format,
  });

  const tmpDir = await mkdtemp(join(tmpdir(), "carousel-mp4-"));
  try {
    // Write the slide HTML (Hyperframes expects index.html)
    await writeFile(join(tmpDir, "index.html"), html, "utf-8");

    // Hyperframes loads GSAP from `<script src="./gsap.min.js">` (LOCAL, not
    // CDN -- v2.2 §7 critical rule). Copy from node_modules.
    const gsapSrc = resolveGsap();
    if (!gsapSrc) {
      throw new Error("gsap_min_js_not_found_in_node_modules");
    }
    await copyFile(gsapSrc, join(tmpDir, "gsap.min.js"));

    // Spawn the Hyperframes CLI inside the tmp dir
    await runHyperframes(tmpDir);

    // Read the produced MP4 from ./renders/*.mp4
    const rendersDir = join(tmpDir, "renders");
    if (!existsSync(rendersDir)) {
      throw new Error("hyperframes_no_renders_dir");
    }
    const files = await readdir(rendersDir);
    const mp4 = files.find((f) => f.toLowerCase().endsWith(".mp4"));
    if (!mp4) throw new Error("hyperframes_no_mp4_output");
    return await readFile(join(rendersDir, mp4));
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

// ─── B-roll renderer ────────────────────────────────────────────────────────
// Mirror exacto de renderMp4(carrusel) pero con buildBrollHtml. Las dimensiones
// 1080×1920 ya viajan en el data-width/data-height del wrapper que emite
// buildBrollHtml — el código de Hyperframes runner es idéntico.
export async function renderBrollMp4(opts: {
  template: BrollTemplate;
  content: BrollContent;
  styleConfig: BrollStyleConfig;
}): Promise<Buffer> {
  const html = buildBrollHtml(
    { template: opts.template, content: opts.content },
    {
      outputMode: "animated",
      styleConfig: opts.styleConfig,
      // Inyectamos las brand fonts (Instrument Serif + DM Sans + JetBrains Mono)
      // como @font-face base64 inline. Cero network request — Hyperframes
      // ya no se cuelga esperando font CDNs.
      fontFaces: brandFontFaces(),
    },
  );

  const tmpDir = await mkdtemp(join(tmpdir(), "broll-mp4-"));
  try {
    await writeFile(join(tmpDir, "index.html"), html, "utf-8");

    const gsapSrc = resolveGsap();
    if (!gsapSrc) {
      throw new Error("gsap_min_js_not_found_in_node_modules");
    }
    await copyFile(gsapSrc, join(tmpDir, "gsap.min.js"));

    // Brolls: 720p (en design-tokens) + standard quality + 1 worker + 24 fps.
    // Cada uno reduce memory:
    //   - 720×1280 = 56% del frame size de 1080×1920
    //   - 1 worker (no 8 auto) → solo 1 Chromium tab para capture
    //   - 24fps × 3s = 72 frames (vs 90 a 30fps) — menos buffer en FFmpeg
    // Combinado: peak memory ~30% del original, evita OOM en encoding step.
    await runHyperframes(tmpDir, {
      quality: "standard",
      workers: 1,
      fps: 24,
    });

    const rendersDir = join(tmpDir, "renders");
    if (!existsSync(rendersDir)) {
      throw new Error("hyperframes_no_renders_dir");
    }
    const files = await readdir(rendersDir);
    const mp4 = files.find((f) => f.toLowerCase().endsWith(".mp4"));
    if (!mp4) throw new Error("hyperframes_no_mp4_output");
    return await readFile(join(rendersDir, mp4));
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

// ─── Motion graphic renderer ────────────────────────────────────────────────
// Same Hyperframes pipeline as brolls — different HTML producer. The motion-
// graphics shell renders 1080×1920 with a 5.5s loop + 1s hold tail per spec.

export async function renderMotionGraphicMp4(opts: {
  templateSlug: string;
  filledSlots: Record<string, unknown>;
  durationS: number;
}): Promise<Buffer> {
  const rendered = renderTemplate(opts.templateSlug, opts.filledSlots);
  const html = buildMotionGraphicHtml({
    templateSlug: opts.templateSlug,
    durationS: opts.durationS,
    rendered,
    outputMode: "animated",
    inlineFontFaces: brandFontFaces(),
    loop: false,
  });

  const tmpDir = await mkdtemp(join(tmpdir(), "mg-mp4-"));
  try {
    await writeFile(join(tmpDir, "index.html"), html, "utf-8");

    const gsapSrc = resolveGsap();
    if (!gsapSrc) throw new Error("gsap_min_js_not_found_in_node_modules");
    await copyFile(gsapSrc, join(tmpDir, "gsap.min.js"));

    // Same constraints as brolls: 1 worker + 24fps to keep peak memory low
    // and avoid OOM on the encoding step. Quality "standard" matches brolls.
    await runHyperframes(tmpDir, {
      quality: "standard",
      workers: 1,
      fps: 24,
    });

    const rendersDir = join(tmpDir, "renders");
    if (!existsSync(rendersDir)) {
      throw new Error("hyperframes_no_renders_dir");
    }
    const files = await readdir(rendersDir);
    const mp4 = files.find((f) => f.toLowerCase().endsWith(".mp4"));
    if (!mp4) throw new Error("hyperframes_no_mp4_output");
    return await readFile(join(rendersDir, mp4));
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

function resolveGsap(): string | null {
  // The worker package depends on gsap, so ./node_modules/gsap/dist/gsap.min.js
  // should always exist in production.
  const candidates = [
    resolve(process.cwd(), "node_modules", "gsap", "dist", "gsap.min.js"),
    resolve(process.cwd(), "..", "node_modules", "gsap", "dist", "gsap.min.js"),
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  return null;
}

/**
 * Resolve the hyperframes CLI binary inside the worker's node_modules.
 *
 * IMPORTANT: we used to invoke `npx hyperframes` from cwd=tmpDir, but the
 * tmp dirs have no node_modules, so npx walks up, falls back to the registry
 * and AUTO-INSTALLS the latest hyperframes (currently 0.5.3) on every render.
 * That's slow, fragile and triggers EBADENGINE warnings + occasional SIGKILLs.
 *
 * By resolving against process.cwd() (which is /app/render-worker in prod and
 * the worker root in dev), we always use the version pinned in package.json.
 */
function resolveHyperframesBin(): string | null {
  const candidates = [
    resolve(process.cwd(), "node_modules", ".bin", "hyperframes"),
    resolve(process.cwd(), "..", "node_modules", ".bin", "hyperframes"),
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  return null;
}

function runHyperframes(
  cwd: string,
  opts: {
    quality?: "draft" | "standard" | "high";
    workers?: number;
    fps?: number;
  } = {},
): Promise<void> {
  return new Promise((res, rej) => {
    const bin = resolveHyperframesBin();
    if (!bin) {
      rej(new Error("hyperframes_bin_not_found_in_node_modules"));
      return;
    }
    const env = {
      ...process.env,
      // The browser path was resolved at Docker build time and exported by the
      // start command; passing it through env makes Hyperframes use it.
      HYPERFRAMES_BROWSER_PATH: process.env.HYPERFRAMES_BROWSER_PATH ?? "",
      PRODUCER_FORCE_SCREENSHOT: "true",
    };
    const quality = opts.quality ?? "high";
    const workers = opts.workers;
    const fps = opts.fps;
    const args = ["render", "--quality", quality];
    if (typeof workers === "number" && workers > 0) {
      args.push("--workers", String(workers));
    }
    if (typeof fps === "number" && fps > 0) {
      args.push("--fps", String(fps));
    }
    // Spawn the locked hyperframes binary directly (avoid npx auto-install).
    // Drop --quiet so we get verbose output for debugging hangs.
    const proc = spawn(bin, args, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const tag = `[hyperframes pid=${proc.pid}]`;
    console.log(`${tag} spawned`);
    let stderr = "";
    let stdout = "";
    proc.stdout?.on("data", (chunk: Buffer) => {
      const s = chunk.toString();
      stdout += s;
      // Stream live so we can see progress in Railway logs.
      process.stdout.write(`${tag} stdout: ${s}`);
    });
    proc.stderr?.on("data", (chunk: Buffer) => {
      const s = chunk.toString();
      stderr += s;
      process.stderr.write(`${tag} stderr: ${s}`);
    });
    const timer = setTimeout(() => {
      console.error(`${tag} TIMEOUT after ${HYPERFRAMES_TIMEOUT_MS}ms — killing`);
      console.error(`${tag} last stdout (last 800 chars): ${stdout.slice(-800)}`);
      console.error(`${tag} last stderr (last 800 chars): ${stderr.slice(-800)}`);
      proc.kill("SIGKILL");
      rej(new Error(`hyperframes_timeout_after_${HYPERFRAMES_TIMEOUT_MS}ms`));
    }, HYPERFRAMES_TIMEOUT_MS);
    proc.on("close", (code) => {
      clearTimeout(timer);
      console.log(`${tag} closed code=${code}`);
      if (code === 0) {
        res();
      } else {
        rej(
          new Error(
            `hyperframes_exit_${code}: stderr=${stderr.slice(-400) || "(empty)"} stdout=${stdout.slice(-400) || "(empty)"}`,
          ),
        );
      }
    });
    proc.on("error", (err) => {
      clearTimeout(timer);
      console.error(`${tag} spawn error:`, err);
      rej(err);
    });
  });
}
