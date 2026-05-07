/**
 * Parser defensivo de `broll_styles.template_code` — un campo text donde el
 * usuario pega JSON con overrides de la BrollStyleConfig.
 *
 * Cualquier input inválido (vacío / no-JSON / shape inesperado) devuelve `{}`
 * y los defaults de marca aplican. NO lanza nunca.
 */

import type { BrollStyleConfig } from "./types";

export function parseBrollStyleConfig(
  raw: string | null | undefined,
): BrollStyleConfig {
  if (!raw || !raw.trim()) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

  const obj = parsed as Record<string, unknown>;
  const out: BrollStyleConfig = {};
  if (typeof obj.bg === "string") out.bg = obj.bg;
  if (typeof obj.accent === "string") out.accent = obj.accent;
  if (typeof obj.fontHeading === "string") out.fontHeading = obj.fontHeading;
  if (typeof obj.stagger === "number" && obj.stagger > 0 && obj.stagger < 2) {
    out.stagger = obj.stagger;
  }
  if (typeof obj.ease === "string") out.ease = obj.ease;
  return out;
}
