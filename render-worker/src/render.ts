// Per-slide rendering: PNG via Playwright, MP4 via Hyperframes.

import { chromium, type Browser } from "playwright";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, readFile, readdir, rm, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { buildSlideHtml } from "../../src/lib/carousel/render";
import type { Slide } from "../../src/lib/carousel/types";

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
}): Promise<Buffer> {
  const html = buildSlideHtml(opts.slide, {
    totalSlides: opts.totalSlides,
    mode: "static",
    index: opts.slide.index,
    outputMode: "static",
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
    // catches a fallback font flash.
    await page.evaluate(() => (document as Document).fonts.ready);
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
}): Promise<Buffer> {
  const html = buildSlideHtml(opts.slide, {
    totalSlides: opts.totalSlides,
    mode: "animated",
    index: opts.slide.index,
    outputMode: "animated",
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

function runHyperframes(cwd: string): Promise<void> {
  return new Promise((res, rej) => {
    const env = {
      ...process.env,
      // The browser path was resolved at Docker build time and exported by the
      // start command; passing it through env makes Hyperframes use it.
      HYPERFRAMES_BROWSER_PATH: process.env.HYPERFRAMES_BROWSER_PATH ?? "",
      PRODUCER_FORCE_SCREENSHOT: "true",
    };
    // npx is fine here -- hyperframes is in node_modules already
    const proc = spawn(
      "npx",
      ["hyperframes", "render", "--quality", "high", "--quiet"],
      { cwd, env, stdio: ["ignore", "pipe", "pipe"], shell: true },
    );
    let stderr = "";
    proc.stdout?.on("data", () => {}); // discard
    proc.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      rej(new Error(`hyperframes_timeout_after_${HYPERFRAMES_TIMEOUT_MS}ms`));
    }, HYPERFRAMES_TIMEOUT_MS);
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) res();
      else
        rej(
          new Error(
            `hyperframes_exit_${code}: ${stderr.slice(0, 500) || "no_stderr"}`,
          ),
        );
    });
    proc.on("error", (err) => {
      clearTimeout(timer);
      rej(err);
    });
  });
}
