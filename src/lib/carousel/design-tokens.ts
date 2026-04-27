/**
 * Design tokens for Ezequiel Lamas Instagram carousels.
 * Source of truth: system_prompt_carrousel_generator_v2.md (§3 DESIGN SYSTEM).
 *
 * These tokens live INSIDE the rendered carousel iframe — they are not the
 * dashboard's brand tokens (those use --ll-* prefix). Do not mix.
 */

export const TOKENS = {
  // Colors
  bg: "#0A0A0A",
  gridLine: "rgba(255,255,255,0.035)",
  text: "#FFFFFF",
  textMuted: "#A0A0A0",
  textFooter: "#888888",
  cardBorder: "rgba(255,255,255,0.08)",
  cardFill: "rgba(255,255,255,0.02)",
  accent: "#8B5CF6",
  accentBorder: "rgba(139,92,246,0.35)",
  accentFill: "rgba(139,92,246,0.12)",
  glow: "drop-shadow(0 0 28px rgba(139,92,246,0.55))",
  strike: "#555555",
  danger: "#EF4444",
  // Layout
  width: 1080,
  height: 1350,
  paddingX: 80,
  paddingTop: 60,
  gridSize: 40,
} as const;

/**
 * The exact CSS that goes inside every slide's <style> block.
 * Includes: CSS variables, base reset, top bar / footer pill, bullets pattern,
 * and the .punch class for serif italic accent + glow.
 *
 * The bullets bug from v2.2 §6: NEVER use display:flex on <li>, use position:absolute
 * for ::before so <strong> inside the li flows correctly.
 */
export const CAROUSEL_CSS = `
:root {
  --bg: ${TOKENS.bg};
  --grid: ${TOKENS.gridLine};
  --text: ${TOKENS.text};
  --muted: ${TOKENS.textMuted};
  --footer: ${TOKENS.textFooter};
  --card-border: ${TOKENS.cardBorder};
  --card-fill: ${TOKENS.cardFill};
  --accent: ${TOKENS.accent};
  --accent-border: ${TOKENS.accentBorder};
  --accent-fill: ${TOKENS.accentFill};
  --strike: ${TOKENS.strike};
  --danger: ${TOKENS.danger};
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  width: ${TOKENS.width}px;
  height: ${TOKENS.height}px;
  overflow: hidden;
  background: var(--bg);
  color: var(--text);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-feature-settings: 'cv11', 'ss01';
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.slide {
  position: relative;
  width: ${TOKENS.width}px;
  height: ${TOKENS.height}px;
  overflow: hidden;
  background: var(--bg);
}

/* Subtle grid background on every slide */
.slide::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid) 1px, transparent 1px);
  background-size: ${TOKENS.gridSize}px ${TOKENS.gridSize}px;
  pointer-events: none;
  z-index: 0;
}

.slide > * { position: relative; z-index: 1; }

/* Top bar */
.topbar {
  position: absolute;
  top: 32px;
  left: ${TOKENS.paddingX}px;
  right: ${TOKENS.paddingX}px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 18px;
  font-weight: 500;
  color: var(--text);
  opacity: 0.55;
  letter-spacing: 0.02em;
}

/* Optional label (PARTE 0X / DATO 0X) */
.label {
  font-family: 'JetBrains Mono', monospace;
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
  font-family: 'JetBrains Mono', monospace;
  font-size: 16px;
  color: var(--footer);
  letter-spacing: 0.05em;
}

/* Frase puñal — serif italic accent + glow */
.punch {
  font-family: 'Playfair Display', 'Georgia', serif;
  font-style: italic;
  font-weight: 700;
  color: var(--accent);
  filter: ${TOKENS.glow};
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
  font-family: 'JetBrains Mono', monospace;
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
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.08em;
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--accent-fill);
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
  background: var(--accent-fill);
  color: var(--accent);
  border-radius: 999px;
  font-weight: 600;
}

/* Card */
.card {
  border: 1px solid var(--card-border);
  background: var(--card-fill);
  border-radius: 18px;
  padding: 30px;
}
`;
