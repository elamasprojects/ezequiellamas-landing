/**
 * Carousel design formats — types.
 *
 * A "format" is a complete visual system applied on top of the 5 structural
 * templates (T1Cover/T2Feature/T3Grid/T4VS/T5CTA). It contributes:
 *   - tokens: colors + font stacks emitted as CSS custom properties
 *   - css: format-specific overrides + decorations
 *   - ornaments: optional HTML painted as a back-layer of every slide
 *   - fontsUrl: the Google Fonts <link> for the format's typography
 */

export type FormatSlug =
  | "diario"
  | "punk"
  | "minimalista"
  | "tech"
  | "esquemas";

export const FORMAT_SLUGS: readonly FormatSlug[] = [
  "diario",
  "punk",
  "minimalista",
  "tech",
  "esquemas",
];

export interface FormatTokens {
  // Surface
  bg: string;
  gridLine: string; // subtle background grid color
  text: string;
  textMuted: string;
  textFooter: string;
  cardBg: string;
  cardBorder: string;

  // Accent
  accent: string;
  accentSoft: string;       // low-opacity fill (badges, chips)
  accentBorder: string;     // border color for accent surfaces
  accentDeep: string;       // darker partner for gradients
  accentGlow: string;       // CSS filter, e.g. "drop-shadow(0 0 28px rgba(...))"

  // Secondary accent (warm, optional)
  accent2: string;
  accent2Soft: string;
  accent2Border: string;

  // Status
  danger: string;
  strike: string;

  // Typography (CSS font-family stacks, must match what fontsUrl loads)
  fontHeading: string;
  fontBody: string;
  fontMono: string;
  fontPunch: string;
}

export interface FormatModule {
  slug: FormatSlug;
  name: string;       // shown in selector tile, e.g. "Diario"
  tagline: string;    // 1 line, e.g. "Editorial impreso para autoridad"
  description: string; // 2-3 lines, shown in tile body
  tokens: FormatTokens;
  /** Format-specific CSS appended after the base CAROUSEL_CSS. */
  css: string;
  /**
   * HTML painted ABOVE .slide::before (gridline) but BELOW the slide content.
   * Empty string if the format has no extra decorations.
   */
  ornaments: string;
  /** Google Fonts <link href="..."> URL value (the href, not the full tag). */
  fontsUrl: string;
}
