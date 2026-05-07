/**
 * Helpers compartidos entre todos los broll templates.
 */

/** Escape mínimo HTML para prevenir injection en text inyectado del user. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Devuelve los words del content filtrados (solo strings con length). */
export function pickWords(words: unknown, max = 8): string[] {
  if (!Array.isArray(words)) return [];
  return words
    .filter((w): w is string => typeof w === "string" && w.trim().length > 0)
    .slice(0, max);
}

/** Devuelve un string trimmed o null. */
export function pickText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

/**
 * Parse "barra de tipear vs barra de dictar, la segunda es 7 veces más larga"
 * o cualquier descripción libre intentando extraer pares (label, value).
 *
 * Heurísticas: si raw.bars está seteado, usar ese; si no, devolver null para
 * que el template decida un fallback genérico.
 */
export interface ParsedBar {
  label: string;
  value: number;
  isAccent: boolean;
}

export function pickBars(
  raw: Record<string, unknown> | null | undefined,
): ParsedBar[] | null {
  if (!raw || !Array.isArray(raw.bars)) return null;
  const bars: ParsedBar[] = [];
  for (const b of raw.bars) {
    if (!b || typeof b !== "object") continue;
    const o = b as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label : null;
    const value = typeof o.value === "number" ? o.value : null;
    if (!label || value === null || !Number.isFinite(value)) continue;
    bars.push({
      label,
      value,
      isAccent: !!o.accent || !!o.isAccent,
    });
  }
  return bars.length > 0 ? bars : null;
}
