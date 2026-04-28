import type { FormatTokens } from "../types";

/**
 * Minimalista — glassmorphism, una sola jerarquía visual fuerte, vibe
 * Linear / Apple / Vercel. Para contenido que no necesita explicar de más.
 */
export const tokens: FormatTokens = {
  bg: "#050505",
  gridLine: "rgba(0,0,0,0)",
  text: "#E6E4E0",
  textMuted: "rgba(255,255,255,0.65)",
  textFooter: "rgba(255,255,255,0.45)",
  cardBg: "rgba(20,20,20,0.55)",
  cardBorder: "rgba(255,255,255,0.12)",

  accent: "#C8FF00",
  accentSoft: "rgba(200,255,0,0.15)",
  accentBorder: "rgba(200,255,0,0.40)",
  accentDeep: "#9CC700",
  accentGlow: "drop-shadow(0 0 32px rgba(200,255,0,0.55))",

  accent2: "#FF6A36",
  accent2Soft: "rgba(255,106,54,0.15)",
  accent2Border: "rgba(255,106,54,0.40)",

  danger: "#FF6A36",
  strike: "rgba(255,255,255,0.30)",

  fontHeading: "'Inter',sans-serif",
  fontBody: "'Inter',sans-serif",
  fontMono: "'JetBrains Mono',monospace",
  fontPunch: "'Fraunces','Playfair Display',serif",
};
