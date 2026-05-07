/**
 * Base CSS para B-rolls. Mirror estructural exacto del patrón carrusel
 * (`src/lib/carousel/design-tokens.ts`) pero a 9:16 (1080×1920).
 *
 * Reglas no negociables (heredadas del carrusel v2.2 §6/§7):
 *   - Usar `position: absolute` para layout, NO `display: flex` en contenedores
 *     hijos directos del wrapper. Hyperframes puede tener issues calculando
 *     dimensiones cuando el composition wrapper tiene flex children.
 *   - GSAP siempre local, nunca CDN.
 *
 * Defaults de la BrollStyleConfig — referenciados por CSS custom props.
 * Los templates leen estos vars (--bg, --accent, --text, etc) igual que
 * los carrusel templates leen los del format catalog.
 */

// Resolución 720×1280 (9:16) en vez de 1080×1920 — reduce FFmpeg encoding
// memory ~56% para evitar el OOM kill que estábamos viendo en `Encoding video`.
// 720p es suficiente para B-roll secundario que se compone dentro de un
// video principal; cuando se sube el video final a 1080p, el broll se
// upscalea sin pérdida visible.
export const SLIDE_WIDTH = 720;
export const SLIDE_HEIGHT = 1280;

export const DEFAULTS = {
  bg: "#0a0a0a",
  accent: "#C8FF00",
  text: "#ffffff",
  // System fonts only — evita el hang de Hyperframes frame-capture esperando
  // fonts de Google CDN. Si quisiéramos Instrument Serif u otra custom font,
  // habría que (1) instalarla local en el Dockerfile, o (2) embeberla
  // inline como base64 en el HTML.
  fontHeading: "Georgia, 'Times New Roman', serif",
  fontBody: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  stagger: 0.18,
  ease: "back.out(1.4)",
} as const;

/**
 * CSS estructural — solo el wrapper `.slide` (mismo nombre de clase que el
 * carrusel para máxima paridad con Hyperframes). Cada template inline su
 * propio CSS específico.
 */
// CSS estructural — fonts inlineadas literal (no `var()`). Hyperframes hace
// regex extraction de `font-family: X` en el HTML y trata `var(--font-body)`
// como literal nombre de font, lo que dispara el warning de "deterministic
// font mapping" y puede colgar el frame capture en algunos casos.
const FONT_HEADING = "Georgia, 'Times New Roman', serif";
const FONT_BODY = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

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
`;

export { FONT_HEADING, FONT_BODY };
