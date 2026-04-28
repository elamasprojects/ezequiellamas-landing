/**
 * Punk format — neo-brutalismo Memphis 80s.
 * Hard shadows (5-8px), thick borders, sticker-like badges, rotated handnotes.
 */
export const css = `
/* Topbar = sticker style */
.topbar {
  font-family: var(--font-heading);
  font-weight: 800;
  font-size: 22px;
  color: var(--text);
  opacity: 1;
  letter-spacing: -0.02em;
  text-transform: none;
}

/* Cover headline — bricolage 900 con highlight */
.cover-headline .line1 {
  font-weight: 900;
  letter-spacing: -0.05em;
}
.cover-headline .punch {
  font-style: italic;
  font-family: var(--font-punch);
  background: var(--accent);
  border: 4px solid var(--text);
  border-radius: 14px;
  box-shadow: 6px 6px 0 var(--text);
  padding: 0 14px;
  display: inline-block;
  color: var(--text);
  filter: none;
}

/* T2-T5 punch shared rule (no glow) */
.punch {
  filter: none;
  font-family: var(--font-punch);
  font-style: italic;
  font-weight: 700;
}

/* Cards = thick black border + chunky shadow */
.feature-card,
.t3-card,
.t4-col {
  background: #FFFFFF;
  border: 4px solid var(--text);
  border-radius: 18px;
  box-shadow: 7px 7px 0 var(--text);
}
.t4-col.right {
  background: var(--accent);
  border-color: var(--text);
}

/* Badges = sticker pill with shadow */
.label,
.badge,
.feature-card-header,
.t4-col-label {
  display: inline-flex;
  align-items: center;
  background: var(--accent);
  color: var(--text);
  border: 3px solid var(--text);
  border-radius: 8px;
  box-shadow: 4px 4px 0 var(--text);
  padding: 4px 12px;
  font-family: var(--font-mono);
  font-weight: 800;
  font-size: 14px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.t4-col.right .t4-col-label {
  background: var(--accent2);
  color: #FFFFFF;
}

/* Strike-through old prices in orange diagonal */
.compare-old { color: var(--strike); text-decoration-color: var(--accent2); }
.compare-new {
  background: var(--accent);
  color: var(--text);
  border: 3px solid var(--text);
  border-radius: 999px;
  padding: 6px 16px;
  box-shadow: 3px 3px 0 var(--text);
}

/* Bullets — pop arrows */
.bullets li::before {
  content: "▶";
  color: var(--accent2);
  font-family: var(--font-mono);
  font-weight: 800;
}
.bullets.x li::before { content: "✕"; color: var(--accent2); }

/* Footer pill = round black sticker */
.footer-pill {
  background: var(--text);
  color: var(--accent);
  border: 3px solid var(--text);
  border-radius: 999px;
  font-family: var(--font-heading);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 10px 22px;
}

/* CTA mascot replaced by sticker */
.cover-mascot {
  background: var(--accent2);
  border: 4px solid var(--text);
  border-radius: 24px;
  box-shadow: 6px 6px 0 var(--text);
  color: var(--text);
  filter: none;
}
.cover-comparison .compare-arrow { color: var(--text); font-weight: 800; }

/* T5 keyword = giant italic sobre highlight lime */
.cta-keyword {
  background: var(--accent);
  border: 5px solid var(--text);
  border-radius: 24px;
  box-shadow: 8px 8px 0 var(--text);
  padding: 12px 32px;
  color: var(--text);
  filter: none;
  font-family: var(--font-punch);
  display: inline-block;
}
.cta-tag {
  background: var(--accent2);
  color: #FFFFFF;
  border: 3px solid var(--text);
  border-radius: 999px;
  box-shadow: 3px 3px 0 var(--text);
  font-family: var(--font-mono);
}
.cta-signature {
  background: #FFFFFF;
  border: 4px solid var(--text);
  border-radius: 999px;
  box-shadow: 5px 5px 0 var(--text);
}
.cta-avatar { background: var(--accent2); border: 3px solid var(--text); }

/* Decorative shapes overlay */
.format-ornaments-shapes { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
.format-ornaments-shapes .circle-lime {
  position: absolute; width: 100px; height: 100px; border-radius: 50%;
  background: var(--accent); border: 5px solid var(--text);
  top: 80px; left: 55%;
}
.format-ornaments-shapes .circle-orange {
  position: absolute; width: 60px; height: 60px; border-radius: 50%;
  background: var(--accent2); border: 4px solid var(--text);
  top: 130px; left: 78%;
}
.format-ornaments-shapes .triangle {
  position: absolute; width: 0; height: 0;
  border-left: 32px solid transparent;
  border-right: 32px solid transparent;
  border-bottom: 54px solid var(--accent2);
  bottom: 240px; right: 50px; transform: rotate(15deg);
}
.format-ornaments-shapes .stripes {
  position: absolute; width: 60px; height: 120px;
  background: repeating-linear-gradient(45deg,
    var(--accent2) 0, var(--accent2) 8px,
    var(--text) 8px, var(--text) 16px);
  border: 4px solid var(--text);
  transform: rotate(20deg);
  top: 380px; right: 80px;
}
.format-ornaments-shapes .grid-dots {
  position: absolute; width: 160px; height: 160px;
  background-image: radial-gradient(var(--text) 2px, transparent 2px);
  background-size: 18px 18px; opacity: 0.5;
  bottom: 220px; left: 60px;
}
.format-ornaments-shapes .diamond {
  position: absolute; width: 60px; height: 60px;
  background: var(--accent); border: 4px solid var(--text);
  transform: rotate(45deg);
  top: 520px; left: 60px;
}
`;
