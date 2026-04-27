/**
 * GSAP timeline for T5 CTA. Total duration: 4.2s.
 * The keyword is the hero — it gets a strong scale-in entrance.
 */
export function timelineT5CTA(): string {
  return `
tl.from(".cta-headline",       { opacity:0, y:20, duration:0.5 }, 0)
  .from(".cta-sub",            { opacity:0, y:15, duration:0.5 }, 0.4)
  .from(".cta-keyword",        { opacity:0, scale:0.5, duration:0.9, ease:"back.out(1.4)" }, 0.9)
  .from(".cta-tags .cta-tag",  { opacity:0, y:15, duration:0.4, stagger:0.1 }, 1.9)
  .from(".cta-signature",      { opacity:0, y:15, duration:0.5 }, 2.6)
  .to({},                       { duration:1.0 }, 3.2);
`;
}

export const DURATION_T5_CTA = 4.2;
