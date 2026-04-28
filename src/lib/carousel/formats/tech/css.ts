/**
 * Tech format — extra CSS layered on top of the base.
 * Hard edges, slight grain texture via SVG noise, mono headings.
 */
export const css = `
/* Headings flatten to mono uppercase for the Tech vibe */
.cover-headline .line1,
.cover-headline .punch,
.feature-card-title,
.t3-headline .main,
.t3-headline .accent,
.t4-headline,
.cta-headline,
.cta-keyword {
  text-transform: uppercase;
  letter-spacing: -0.02em;
}

/* Underline on accent emphasis (Vetements-style) */
.cover-headline .punch,
.feature-card-title .punch,
.t3-headline .accent .punch,
.t4-headline .punch,
.cta-keyword {
  text-decoration: none;
  background-image: linear-gradient(transparent 78%, var(--accent) 78%, var(--accent) 92%, transparent 92%);
  background-repeat: no-repeat;
  background-size: 100% 100%;
  padding: 0 4px;
}
`;
