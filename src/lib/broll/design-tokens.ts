/**
 * Base CSS y dimensiones de B-roll. Mismo patrón que `carousel/design-tokens.ts`
 * pero a 9:16 (1080×1920) para Reels/Shorts/TikTok.
 */

export const SLIDE_WIDTH = 1080;
export const SLIDE_HEIGHT = 1920;

/** Defaults de la BrollStyleConfig — referenciados por CSS custom props. */
export const DEFAULTS = {
  bg: "#0a0a0a",
  accent: "#C8FF00",
  text: "#ffffff",
  fontHeading: "'Instrument Serif', serif",
  fontBody: "'DM Sans', system-ui, sans-serif",
  stagger: 0.18,
  ease: "back.out(1.4)",
} as const;

export const BASE_BROLL_CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  width: ${SLIDE_WIDTH}px;
  height: ${SLIDE_HEIGHT}px;
  overflow: hidden;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.broll {
  position: relative;
  width: ${SLIDE_WIDTH}px;
  height: ${SLIDE_HEIGHT}px;
  overflow: hidden;
  background: var(--bg);
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* WordStack template */
.ws {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px;
  gap: 0;
}
.ws-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 20px;
  width: max-content;
  margin: 0 auto;
}
.ws-word {
  font-family: var(--font-heading);
  font-weight: 600;
  color: var(--accent);
  letter-spacing: -0.02em;
  line-height: 1;
  white-space: nowrap;
  text-shadow: 0 0 30px color-mix(in srgb, var(--accent) 25%, transparent);
}
.ws-word[data-words="1"] { font-size: 320px; }
.ws-word[data-words="2"] { font-size: 280px; }
.ws-word[data-words="3"] { font-size: 240px; }
.ws-word[data-words="4"] { font-size: 200px; }
.ws-word[data-words="5"] { font-size: 170px; }
.ws-word[data-words="6"] { font-size: 150px; }
.ws-word[data-words="7"] { font-size: 130px; }
.ws-word[data-words="8"] { font-size: 115px; }
.ws-cue {
  position: absolute;
  bottom: 120px;
  left: 80px;
  right: 80px;
  text-align: center;
  font-family: var(--font-body);
  font-size: 36px;
  color: color-mix(in srgb, var(--text) 70%, transparent);
  letter-spacing: 0.02em;
  line-height: 1.3;
}
`;
