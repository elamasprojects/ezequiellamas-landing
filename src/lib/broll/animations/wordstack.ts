/**
 * GSAP timeline para `WordStack`. Las palabras aparecen una a una con stagger,
 * cada una con un pop scale + fade + slide-up. Termina con un beat de hold
 * para que Hyperframes cierre con un frame estático (regla §7 v2.2 carrusel).
 *
 * Returns el body JS como string — se inyecta dentro del <script> de Hyperframes.
 */

import { DEFAULTS } from "../design-tokens";

/** Duración estimada total del WordStack. Used por buildBrollHtml para el data-duration. */
export function durationWordStack(wordCount: number, stagger: number = DEFAULTS.stagger): number {
  // reveal por palabra (0.5s) + stagger acumulado + pulse opcional + hold final
  const revealEnd = 0.5 + Math.max(0, wordCount - 1) * stagger;
  const pulseEnd = revealEnd + 0.4;
  const holdEnd = pulseEnd + 1.0;
  // Mínimo 3s para que sea usable como B-roll (no un flash).
  return Math.max(3.0, holdEnd);
}

/** Body GSAP JS. Recibe el ease/stagger como literales para inlinearlos. */
export function timelineWordStack(opts: {
  wordCount: number;
  stagger?: number;
  ease?: string;
}): string {
  const stagger = typeof opts.stagger === "number" && opts.stagger > 0
    ? opts.stagger
    : DEFAULTS.stagger;
  const ease = opts.ease ?? DEFAULTS.ease;
  const revealEnd = 0.5 + Math.max(0, opts.wordCount - 1) * stagger;

  return `
tl.from(".ws-word",
        { opacity: 0, y: 80, scale: 0.7, duration: 0.55, stagger: ${stagger}, ease: "${ease}" },
        0)
  .from(".ws-cue",
        { opacity: 0, y: 20, duration: 0.5, ease: "power2.out" },
        ${(revealEnd + 0.1).toFixed(2)})
  .to({}, { duration: 1.0 }, ${(revealEnd + 0.6).toFixed(2)});
`;
}
