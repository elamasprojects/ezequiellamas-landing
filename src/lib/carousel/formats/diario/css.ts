/**
 * Diario format — editorial newspaper styling.
 * Drop caps, ornamental dividers, masthead-style topbar, serif body.
 */
export const css = `
/* Newspaper paper texture overlay */
.format-ornaments-paper {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background-image: radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px);
  background-size: 3px 3px;
  mix-blend-mode: multiply;
}

/* Masthead-style topbar (double rule under) */
.topbar {
  border-bottom: 3px double var(--text);
  padding-bottom: 12px;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.18em;
}

/* Punch is italic serif red, NO glow */
.punch {
  font-family: var(--font-punch);
  font-style: italic;
  font-weight: 700;
  color: var(--accent);
  filter: none;
}

/* Headlines centered + serif italic */
.cover { text-align: center; }
.cover-headline .line1 {
  font-family: var(--font-heading);
  font-weight: 400;
  font-style: italic;
}
.cover-headline .punch { font-style: italic; }

/* Drop cap hint on contextText / cardTitle paragraphs */
.feature-context::first-letter,
.t3-callout::first-letter {
  font-family: var(--font-heading);
  font-size: 56px;
  float: left;
  line-height: 0.85;
  padding: 4px 8px 0 0;
  color: var(--accent);
  font-style: italic;
  font-weight: 400;
}

/* Card chrome — printed paper */
.feature-card,
.t3-card,
.t4-col {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 4px;
  box-shadow: 0 2px 0 rgba(0,0,0,0.06);
}

/* Footer pill flat, no rounded fill */
.footer-pill {
  border-radius: 0;
  border: 0;
  border-top: 1px solid var(--text);
  border-bottom: 1px solid var(--text);
  padding: 6px 24px;
  font-family: var(--font-mono);
  background: transparent;
}

/* Bullets — keep > but in serif italic accent for editorial mood */
.bullets li::before {
  content: "❦";
  font-family: var(--font-heading);
  color: var(--accent);
  font-style: italic;
}
.bullets.x li::before {
  content: "✕";
  color: var(--accent);
}
`;
