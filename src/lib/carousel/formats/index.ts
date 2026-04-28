/**
 * Carousel design formats — central catalog.
 *
 * Each format is a complete visual system applied on top of the 5 structural
 * templates. Adding a new format means: create a folder under `formats/<slug>/`
 * with `tokens.ts`, `css.ts`, `ornaments.ts`, `reference.html`, `index.ts`,
 * import it here, and add the slug to FormatSlug + the M15 CHECK constraint.
 */

import type { FormatModule, FormatSlug } from "./types";
import diario from "./diario";
import punk from "./punk";
import minimalista from "./minimalista";
import tech from "./tech";
import esquemas from "./esquemas";

export type { FormatModule, FormatSlug, FormatTokens } from "./types";
export { FORMAT_SLUGS } from "./types";

export const FORMATS: Record<FormatSlug, FormatModule> = {
  diario,
  punk,
  minimalista,
  tech,
  esquemas,
};

export const FORMAT_LIST: ReadonlyArray<FormatModule> = Object.values(FORMATS);

export const DEFAULT_FORMAT: FormatSlug = "tech";

export function getFormat(slug: FormatSlug | string): FormatModule {
  const f = FORMATS[slug as FormatSlug];
  if (!f) throw new Error(`Unknown carousel format: ${slug}`);
  return f;
}

export function isFormatSlug(s: string | null | undefined): s is FormatSlug {
  return !!s && s in FORMATS;
}

/**
 * Render the format's tokens as CSS custom properties on :root, ready to be
 * injected inside the carousel's <style> block.
 */
export function tokensToCssVars(slug: FormatSlug | string): string {
  const f = getFormat(slug);
  const t = f.tokens;
  return `:root{
  --bg: ${t.bg};
  --grid: ${t.gridLine};
  --text: ${t.text};
  --muted: ${t.textMuted};
  --footer: ${t.textFooter};
  --card-bg: ${t.cardBg};
  --card-border: ${t.cardBorder};
  --card-fill: ${t.cardBg};
  --accent: ${t.accent};
  --accent-soft: ${t.accentSoft};
  --accent-border: ${t.accentBorder};
  --accent-fill: ${t.accentSoft};
  --accent-deep: ${t.accentDeep};
  --accent-glow: ${t.accentGlow};
  --accent2: ${t.accent2};
  --accent2-soft: ${t.accent2Soft};
  --accent2-border: ${t.accent2Border};
  --danger: ${t.danger};
  --strike: ${t.strike};
  --font-heading: ${t.fontHeading};
  --font-body: ${t.fontBody};
  --font-mono: ${t.fontMono};
  --font-punch: ${t.fontPunch};
}`;
}
