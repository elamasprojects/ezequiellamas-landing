/**
 * GSAP timeline for T4 VS Comparison. Total duration: 4.0s.
 */
export function timelineT4VS(): string {
  return `
tl.from(".label",         { opacity:0, y:-10, duration:0.4 }, 0)
  .from(".t4-headline",   { opacity:0, y:20, duration:0.5 }, 0.3)
  .from(".t4-col.left",   { opacity:0, x:-30, duration:0.5 }, 0.8)
  .from(".t4-vs-badge",   { opacity:0, scale:0.5, duration:0.4, ease:"back.out(1.5)" }, 1.2)
  .from(".t4-col.right",  { opacity:0, x:30, duration:0.5 }, 1.4)
  .from(".t4-col .bullets li", { opacity:0, x:15, duration:0.3, stagger:0.06 }, 2.0)
  .to({},                  { duration:1.0 }, 3.0);
`;
}

export const DURATION_T4_VS = 4.0;
