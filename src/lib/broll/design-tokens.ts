/**
 * Brand tokens para B-rolls V2. Mismo design language que la landing page
 * de @ezequiellamass — fonts (Instrument Serif + DM Sans + JetBrains Mono),
 * paleta dark con accent acid yellow #c8ff00 y warm orange #ff6b35.
 *
 * Resolución 720×1280 (9:16) — calibrada para que FFmpeg encode no OOMee
 * en Railway (1080×1920 era 56% más grande y mataba el container).
 */

export const SLIDE_WIDTH = 720;
export const SLIDE_HEIGHT = 1280;

/** Brand palette — espejo de --ll-* en src/index.css. */
export const BRAND = {
  bg: "#0a0a0a",
  surface: "#111111",
  surface2: "#161616",
  border: "#1e1e1e",
  text: "#e8e4de", // warm off-white (no pure white)
  textMuted: "#8a8580",
  textDim: "#5a5550",
  accent: "#c8ff00", // acid yellow-green
  warm: "#ff6b35", // orange
  blue: "#4a9eff",
} as const;

export const FONT_HEADING = "'Instrument Serif', Georgia, serif";
export const FONT_BODY = "'DM Sans', system-ui, -apple-system, sans-serif";
export const FONT_MONO = "'JetBrains Mono', ui-monospace, monospace";

export const DEFAULTS = {
  bg: BRAND.bg,
  accent: BRAND.accent,
  secondary: BRAND.warm,
  text: BRAND.text,
  fontHeading: FONT_HEADING,
  fontBody: FONT_BODY,
  fontMono: FONT_MONO,
  stagger: 0.18,
  ease: "back.out(1.4)",
} as const;

/**
 * CSS estructural — solo el wrapper `.slide` y normalize. Cada template
 * inline su propio CSS específico.
 */
export const BASE_BROLL_CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  width: ${SLIDE_WIDTH}px;
  height: ${SLIDE_HEIGHT}px;
  overflow: hidden;
  background: var(--bg);
  color: var(--text);
  font-family: ${FONT_BODY};
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.slide {
  position: relative;
  width: ${SLIDE_WIDTH}px;
  height: ${SLIDE_HEIGHT}px;
  overflow: hidden;
  background: var(--bg);
  color: var(--text);
}

/* Subtle grid background — same pattern que carrusel pero más sutil */
.slide::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
  z-index: 0;
}
.slide > * { position: relative; z-index: 1; }
`;
