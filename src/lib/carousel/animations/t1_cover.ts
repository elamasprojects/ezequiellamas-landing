/**
 * GSAP timeline for T1 Cover. Total duration: 4.5s.
 * Returns the timeline body JS as a string (gets injected inside the
 * Hyperframes <script> tag in the rendered page).
 *
 * Source: system_prompt_carrousel_generator_v2.md §7 (T1 preset).
 */
export function timelineT1Cover(): string {
  return `
tl.from(".cover-mascot",         { opacity:0, scale:0.5, duration:0.6, ease:"back.out(1.5)" }, 0)
  .from(".cover-headline .line1", { opacity:0, y:30, duration:0.5 }, 0.3)
  .from(".cover-headline .punch", { opacity:0, scale:0.85, duration:0.8, ease:"power2.out" }, 1.0)
  .from(".cover-sub",             { opacity:0, y:15, duration:0.5 }, 1.7)
  .from(".cover-comparison > *",  { opacity:0, x:-20, duration:0.4, stagger:0.15 }, 2.2)
  .from(".preview-row .chip",     { opacity:0, y:10, duration:0.3, stagger:0.06 }, 3.0)
  .to({},                          { duration:1.0 }, 3.5);
`;
}

export const DURATION_T1_COVER = 4.5;
