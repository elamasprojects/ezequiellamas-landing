/**
 * GSAP timeline for T2 Single Feature / Concept. Total duration: 4.3s.
 * Adapted from the v2.2 §7 "T5 / T2" preset.
 */
export function timelineT2Feature(): string {
  return `
tl.from(".label",                  { opacity:0, x:-20, duration:0.4 }, 0)
  .from(".feature-iconrow > *",    { opacity:0, x:-20, duration:0.4, stagger:0.1 }, 0.3)
  .from(".feature-pricerow > *",   { opacity:0, x:-20, duration:0.4, stagger:0.05 }, 0.7)
  .from(".feature-context",        { opacity:0, y:15, duration:0.5 }, 1.1)
  .from(".feature-card",           { opacity:0, y:25, duration:0.5 }, 1.5)
  .from(".feature-card-title",     { opacity:0, y:15, duration:0.5 }, 1.9)
  .from(".feature-card-title .punch",{ opacity:0, scale:0.85, duration:0.6, ease:"power2.out" }, 2.2)
  .from(".feature-card .bullets li",{ opacity:0, x:15, duration:0.35, stagger:0.08 }, 2.6)
  .to({},                           { duration:1.0 }, 3.3);
`;
}

export const DURATION_T2_FEATURE = 4.3;
