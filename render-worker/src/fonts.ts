// Brand font faces inlined as base64 data URIs.
//
// Hyperframes' Chromium en Railway no puede cargar fonts CDN (timeout en
// frame capture). Solución: leemos los .woff2 de los packages @fontsource/*
// instalados localmente, los inlineamos como `data:font/woff2;base64,...`
// directamente en el `<style>` del HTML que va al browser. Cero network.
//
// Fonts: las mismas que la landing page de @ezequiellamass:
//   - Instrument Serif (display, headings, italic accent)
//   - DM Sans (body)
//   - JetBrains Mono (UI / technical labels)

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// In-memory cache — los .woff2 se leen una sola vez.
const CACHE = new Map<string, string>();

function readBase64(rel: string): string | null {
  const cached = CACHE.get(rel);
  if (cached) return cached;
  // Buscamos en varias ubicaciones posibles del node_modules:
  //   prod (Docker): /app/render-worker/node_modules/...
  //   dev: ./node_modules/... relativo al cwd
  const candidates = [
    resolve(process.cwd(), "node_modules", rel),
    resolve(__dirname, "..", "node_modules", rel),
    resolve(__dirname, "..", "..", "node_modules", rel),
  ];
  for (const path of candidates) {
    if (existsSync(path)) {
      const buf = readFileSync(path);
      const b64 = buf.toString("base64");
      CACHE.set(rel, b64);
      return b64;
    }
  }
  console.warn(`[fonts] not found: ${rel}`);
  return null;
}

function fontFace(
  family: string,
  style: "normal" | "italic",
  weight: number,
  rel: string,
): string {
  const b64 = readBase64(rel);
  if (!b64) return "";
  return `@font-face {
  font-family: '${family}';
  font-style: ${style};
  font-weight: ${weight};
  font-display: block;
  src: url('data:font/woff2;base64,${b64}') format('woff2');
}`;
}

/**
 * Returns el bloque CSS con todos los `@font-face` para las brand fonts.
 * Llamar una vez por render; la siguiente call usa cache.
 */
export function brandFontFaces(): string {
  return [
    fontFace(
      "Instrument Serif",
      "normal",
      400,
      "@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2",
    ),
    fontFace(
      "Instrument Serif",
      "italic",
      400,
      "@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2",
    ),
    fontFace(
      "DM Sans",
      "normal",
      400,
      "@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff2",
    ),
    fontFace(
      "DM Sans",
      "normal",
      500,
      "@fontsource/dm-sans/files/dm-sans-latin-500-normal.woff2",
    ),
    fontFace(
      "DM Sans",
      "normal",
      700,
      "@fontsource/dm-sans/files/dm-sans-latin-700-normal.woff2",
    ),
    fontFace(
      "JetBrains Mono",
      "normal",
      400,
      "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2",
    ),
    fontFace(
      "JetBrains Mono",
      "normal",
      500,
      "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2",
    ),
  ]
    .filter(Boolean)
    .join("\n\n");
}
