import type { FormatTokens } from "../types";

/**
 * Diario — editorial impreso. Bodoni / Caslon, papel cream, rojo periodístico.
 * Para contenido que pesa más que el algoritmo (autoridad, análisis, casos largos).
 */
export const tokens: FormatTokens = {
  bg: "#F4F1EA",
  gridLine: "rgba(0,0,0,0)", // sin grid (papel limpio)
  text: "#0A0A0A",
  textMuted: "#555555",
  textFooter: "#888888",
  cardBg: "#FFFFFF",
  cardBorder: "rgba(10,10,10,0.18)",

  accent: "#C73E1D",
  accentSoft: "rgba(199,62,29,0.08)",
  accentBorder: "rgba(199,62,29,0.45)",
  accentDeep: "#8E2A12",
  accentGlow: "none",

  accent2: "#0A0A0A",
  accent2Soft: "rgba(10,10,10,0.04)",
  accent2Border: "rgba(10,10,10,0.45)",

  danger: "#C73E1D",
  strike: "#888888",

  fontHeading: "'Libre Caslon Display','Bodoni Moda',serif",
  fontBody: "'Bodoni Moda',serif",
  fontMono: "'JetBrains Mono',monospace",
  fontPunch: "'Bodoni Moda','Libre Caslon Display',serif",
};
