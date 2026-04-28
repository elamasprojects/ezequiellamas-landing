/**
 * Base CSS shared across all carousel design formats.
 *
 * This file used to hold a single hardcoded TOKENS object (dark + purple).
 * That has been replaced by a per-format token system (see ./formats/*).
 * What remains here is the *structural* CSS — layout, topbar, footer pill,
 * shared element patterns (bullets, compare, badges, card chrome) — all
 * referencing CSS custom properties that the format catalog injects.
 *
 * Hot rules carried over from v2.2:
 *   §6 Bullets: ::before is `position:absolute`, never `display:flex`.
 *   §7 No CDN deps in animated mode (gsap is local).
 */

export const SLIDE_WIDTH = 1080;
export const SLIDE_HEIGHT = 1350;

export const BASE_CAROUSEL_CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  width: ${SLIDE_WIDTH}px;
  height: ${SLIDE_HEIGHT}px;
  overflow: hidden;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  font-feature-settings: 'cv11', 'ss01';
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.slide {
  position: relative;
  width: ${SLIDE_WIDTH}px;
  height: ${SLIDE_HEIGHT}px;
  overflow: hidden;
  background: var(--bg);
  color: var(--text);
}

/* Subtle grid background driven by --grid (transparent if format opts out). */
.slide::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
  z-index: 0;
}

.slide > * { position: relative; z-index: 1; }
.slide > .format-ornaments,
.slide > .format-ornaments-paper,
.slide > .format-ornaments-shapes,
.slide > .format-ornaments-orbs,
.slide > .format-ornaments-blueprint { z-index: 0; }

/* Top bar */
.topbar {
  position: absolute;
  top: 32px;
  left: 80px;
  right: 80px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 500;
  color: var(--text);
  opacity: 0.6;
  letter-spacing: 0.02em;
}

/* Optional small label (PARTE 0X / DATO 0X) */
.label {
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

/* Footer "desliza →" pill */
.footer-pill {
  position: absolute;
  bottom: 56px;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border: 1px solid var(--card-border);
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 16px;
  color: var(--footer);
  letter-spacing: 0.05em;
  background: transparent;
}

/* Frase puñal — styled by --font-punch + --accent + --accent-glow */
.punch {
  font-family: var(--font-punch);
  font-style: italic;
  font-weight: 700;
  color: var(--accent);
  filter: var(--accent-glow);
  letter-spacing: -0.01em;
}

/* Bullets — POSITION ABSOLUTE pattern, never flex (see v2.2 §6) */
.bullets { list-style: none; margin: 0; padding: 0; }
.bullets li {
  list-style: none;
  position: relative;
  padding-left: 32px;
  margin-bottom: 14px;
  font-size: 25px;
  line-height: 1.4;
  color: var(--muted);
  font-weight: 400;
}
.bullets li::before {
  content: ">";
  position: absolute;
  left: 0;
  top: 0;
  color: var(--accent);
  font-family: var(--font-mono);
  font-weight: 700;
}
.bullets.x li::before {
  content: "x";
  color: var(--danger);
}
.bullets li strong {
  color: var(--text);
  font-weight: 600;
}

/* Mini-badges */
.badge {
  display: inline-flex;
  align-items: center;
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.08em;
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--accent-soft);
  color: var(--accent);
  text-transform: uppercase;
}

/* Comparison: $X strikethrough → $0 accent pill */
.compare-old {
  color: var(--strike);
  text-decoration: line-through;
  text-decoration-thickness: 2px;
}
.compare-new {
  display: inline-block;
  padding: 8px 18px;
  border: 1px solid var(--accent-border);
  background: var(--accent-soft);
  color: var(--accent);
  border-radius: 999px;
  font-weight: 600;
}

/* Card */
.card {
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  border-radius: 18px;
  padding: 30px;
}
`;
