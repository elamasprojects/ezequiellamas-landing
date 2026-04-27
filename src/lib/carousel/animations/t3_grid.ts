/**
 * GSAP timeline for T3 4-Grid. Total duration: 3.7s.
 * Source: system_prompt_carrousel_generator_v2.md §7 (T3 preset).
 */
export function timelineT3Grid(): string {
  return `
tl.from(".label",                  { opacity:0, x:-20, duration:0.4 }, 0)
  .from(".t3-headline .main",      { opacity:0, y:20, duration:0.5 }, 0.2)
  .from(".t3-headline .accent",    { opacity:0, y:20, duration:0.5 }, 0.5)
  .from(".t3-card",                { opacity:0, y:25, scale:0.96, duration:0.5, stagger:0.12, ease:"power2.out" }, 0.9)
  .from(".t3-callout",             { opacity:0, y:15, duration:0.5 }, 2.0)
  .to({},                           { duration:1.0 }, 2.7);
`;
}

export const DURATION_T3_GRID = 3.7;
