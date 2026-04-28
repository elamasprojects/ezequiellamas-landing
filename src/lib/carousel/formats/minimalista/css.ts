/**
 * Minimalista — glassmorphism, gradient orbs, rounded large radii.
 * Una sola jerarquía visual fuerte por slide.
 */
export const css = `
/* Glass cards everywhere */
.feature-card,
.t3-card,
.t4-col,
.cta-signature {
  background: var(--card-bg);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border: 1px solid var(--card-border);
  border-radius: 24px;
  box-shadow: 0 30px 60px rgba(0,0,0,0.5);
}
.t4-col.right {
  border-color: var(--accent-border);
  background: rgba(200,255,0,0.06);
}

/* Topbar = glass mini-pill */
.topbar {
  font-family: var(--font-mono);
  font-size: 14px;
  letter-spacing: 0.18em;
  color: rgba(255,255,255,0.65);
  opacity: 1;
}

/* Pills (label, badge, footer) all rounded full */
.label,
.badge,
.feature-card-header,
.t4-col-label {
  background: var(--accent-soft);
  color: var(--accent);
  border: 1px solid var(--accent-border);
  border-radius: 999px;
  padding: 6px 14px;
  font-family: var(--font-mono);
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.compare-new {
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  border-radius: 999px;
  padding: 6px 16px;
  color: var(--accent);
}

/* Headlines — Inter 700 letter-spacing tight */
.cover-headline .line1,
.t3-headline .main,
.cta-headline {
  font-weight: 700;
  letter-spacing: -0.035em;
}
.cover-headline .punch,
.t3-headline .accent .punch,
.cta-keyword {
  font-family: var(--font-punch);
  font-style: italic;
  font-weight: 400;
  color: var(--accent);
  filter: var(--accent-glow);
}

/* Footer pill stays subtle */
.footer-pill {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.10);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 999px;
}

/* T5 keyword — giant glow */
.cta-keyword {
  filter: var(--accent-glow);
}
.cta-tag {
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  color: var(--accent);
  border-radius: 999px;
  font-family: var(--font-mono);
}
.cta-avatar {
  background: linear-gradient(135deg, var(--accent), var(--accent-deep));
}

/* Bullets keep > but in accent */
.bullets li::before { color: var(--accent); }
`;
