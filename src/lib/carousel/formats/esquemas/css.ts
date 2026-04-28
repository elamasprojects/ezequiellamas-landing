/**
 * Esquemas — blueprint architect, diagram-style.
 * Title block + meta info, technical labels, ports/nodes feel.
 */
export const css = `
/* Topbar = title block (uppercase mono with brackets) */
.topbar {
  font-family: var(--font-mono);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-size: 14px;
  border-bottom: 1px solid var(--accent-border);
  padding-bottom: 12px;
  color: rgba(200,255,0,0.7);
  opacity: 1;
}

/* Cards = blueprint nodes (sharp corners + accent border) */
.feature-card,
.t3-card,
.t4-col,
.cta-signature {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 6px;
}
.t4-col.right {
  background: var(--accent-soft);
  border-color: var(--accent-border);
}

/* Labels = technical port name */
.label,
.feature-card-header,
.t4-col-label {
  font-family: var(--font-mono);
  font-size: 13px;
  letter-spacing: 0.20em;
  color: var(--accent);
  text-transform: uppercase;
  background: transparent;
  border: 0;
  border-left: 2px solid var(--accent);
  padding: 0 0 0 10px;
  border-radius: 0;
}

/* Headlines — sans 300 light huge */
.cover-headline .line1,
.t3-headline .main,
.t4-headline {
  font-family: var(--font-heading);
  font-weight: 300;
  letter-spacing: -0.025em;
}
.cover-headline .punch,
.t3-headline .accent .punch,
.cta-keyword {
  font-family: var(--font-punch);
  font-style: italic;
  font-weight: 400;
  color: var(--accent2);
  filter: none;
}

/* Bullets = mono arrows */
.bullets li::before {
  content: "→";
  color: var(--accent);
  font-family: var(--font-mono);
}
.bullets.x li::before { content: "✕"; color: var(--accent2); }

/* Footer pill = bracket annotation */
.footer-pill {
  background: transparent;
  border: 1px solid var(--accent-border);
  border-radius: 4px;
  font-family: var(--font-mono);
  letter-spacing: 0.15em;
  color: var(--accent);
  text-transform: uppercase;
}

/* Cover mascot = blueprint node box */
.cover-mascot {
  background: var(--accent-soft);
  border: 2px solid var(--accent);
  border-radius: 6px;
  font-family: var(--font-mono);
  color: var(--accent);
  filter: var(--accent-glow);
}

/* T5 keyword = giant orange italic over blueprint */
.cta-keyword { letter-spacing: -0.025em; }
.cta-tag {
  background: transparent;
  border: 1px solid var(--accent-border);
  color: var(--accent);
  border-radius: 4px;
  font-family: var(--font-mono);
}
.cta-avatar { background: var(--accent); }

/* Decorative dual-grid blueprint background */
.format-ornaments-blueprint {
  position: absolute; inset: 0; pointer-events: none; z-index: 0;
}
.format-ornaments-blueprint::before {
  content: ""; position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(200,255,0,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(200,255,0,0.04) 1px, transparent 1px);
  background-size: 12px 12px;
}
`;
