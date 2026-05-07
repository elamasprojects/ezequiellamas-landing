/**
 * GSAP timeline para `WordStack`. Las palabras aparecen una a una con stagger,
 * cada una con un fade + slide-up + scale-in. Termina con un beat de hold
 * para que Hyperframes cierre con un frame estático.
 *
 * Returns el body JS como string — se inyecta dentro del <script> de Hyperframes.
 *
 * IMPORTANTE: solo emitimos tweens para selectores que SÍ existen en el DOM
 * (controlado por `hasCue`). Tweens contra selectores vacíos hacen que GSAP
 * inserte un nodo vacío con duración positiva, lo que puede colgar a Hyperframes
 * en su loop de captura de frames.
 */

import { DEFAULTS } from "../design-tokens";

/** Duración estimada total del WordStack. Used por buildBrollHtml para data-duration. */
export function durationWordStack(wordCount: number, stagger: number = DEFAULTS.stagger): number {
  // reveal por palabra (0.55s) + stagger acumulado + hold final
  const revealEnd = 0.55 + Math.max(0, wordCount - 1) * stagger;
  const holdEnd = revealEnd + 1.2;
  // Mínimo 3s para que sea usable como B-roll.
  return Math.max(3.0, holdEnd);
}

/** Body GSAP JS. */
export function timelineWordStack(opts: {
  wordCount: number;
  stagger?: number;
  ease?: string;
  hasCue: boolean;
}): string {
  const stagger = typeof opts.stagger === "number" && opts.stagger > 0
    ? opts.stagger
    : DEFAULTS.stagger;
  const ease = opts.ease ?? DEFAULTS.ease;
  const revealEnd = 0.55 + Math.max(0, opts.wordCount - 1) * stagger;

  const wordsTween = `
tl.from(".ws-word",
        { opacity: 0, y: 80, scale: 0.7, duration: 0.55, stagger: ${stagger}, ease: "${ease}" },
        0)`;

  const cueTween = opts.hasCue
    ? `\n  .from(".ws-cue", { opacity: 0, y: 20, duration: 0.5, ease: "power2.out" }, ${(revealEnd + 0.1).toFixed(2)})`
    : "";

  // Hold final — copiamos verbatim el patrón del carrusel (T1Cover line 16):
  // `.to({}, { duration: 1.0 }, 3.5)`. Es un delay-tween que extiende la
  // timeline sin animar nada. Hyperframes consume `data-duration` del wrapper
  // y termina cuando llega al final, así que necesita que la timeline
  // efectivamente dure ese tiempo.
  const holdTween = `\n  .to({}, { duration: 1.0 }, ${(revealEnd + 0.2).toFixed(2)});`;

  return wordsTween + cueTween + holdTween;
}
