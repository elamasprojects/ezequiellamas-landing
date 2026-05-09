// Shared HTML+CSS+GSAP shell for motion graphic templates.
// Lives in src/lib/ so both the frontend (TemplatePreviewIframe via srcDoc)
// and the render-worker (Hyperframes via Playwright) consume the same module.
//
// Two output modes:
//   - "animated": worker rendering. Fonts are inlined via @font-face base64
//     (the caller passes the CSS string), GSAP is a local file at ./gsap.min.js.
//   - "preview": browser iframe. Fonts via Google Fonts <link>, GSAP via CDN.
//     No build artefacts needed.
//
// Each template returns a body fragment + a GSAP timeline body. The shell
// wraps them in a 1080x1920 stage with the brand fonts loaded, the loop set
// to 5.5s, and the cinematic ease applied as the timeline default.

export const STAGE_W = 1080;
export const STAGE_H = 1920;
export const LOOP_S = 5.5;
export const HOLD_TAIL_S = 1.0;

export const BRAND = {
  bg: "#0A0A0A",
  bgRaised: "#141414",
  bgCard: "#1A1A1A",
  bgCardHi: "#242424",
  text: "#E6E0E0",
  textMuted: "#888888",
  textDim: "#555555",
  lime: "#C8FF00",
  orange: "#FF6A36",
  border: "rgba(230,224,224,0.08)",
  borderMid: "rgba(230,224,224,0.14)",
  borderStrong: "rgba(230,224,224,0.24)",
  danger: "#EF4444",
  blue: "#60A5FA",
} as const;

export const EASE = "power2.out";

export function escHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface RenderedTemplate {
  body: string;
  timeline: string;
  cssExtra?: string;
}

export type OutputMode = "animated" | "preview";

export interface BuildHtmlOptions {
  templateSlug: string;
  durationS: number;
  rendered: RenderedTemplate;
  outputMode: OutputMode;
  /**
   * For "animated" mode: inline @font-face CSS string the worker provides
   * (brandFontFaces from render-worker/src/fonts.ts). For "preview" mode this
   * is ignored — Google Fonts CDN is injected instead.
   */
  inlineFontFaces?: string;
  /** Loop the timeline indefinitely. Default true for preview, false for worker. */
  loop?: boolean;
}

export function buildMotionGraphicHtml(opts: BuildHtmlOptions): string {
  const { templateSlug, durationS, rendered, outputMode, inlineFontFaces } = opts;
  const totalS = Math.max(durationS + HOLD_TAIL_S, LOOP_S);
  const loop = opts.loop ?? (outputMode === "preview");

  // Mode-specific font loading + GSAP source.
  const fontsBlock = outputMode === "animated"
    ? (inlineFontFaces ?? "")
    : `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Instrument+Serif:ital@1&family=JetBrains+Mono:wght@400;500;700&display=swap');`;

  const gsapTag = outputMode === "animated"
    ? `<script src="./gsap.min.js"></script>`
    : `<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${escHtml(templateSlug)}</title>
<style>
${fontsBlock}

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  width: ${STAGE_W}px;
  height: ${STAGE_H}px;
  background: ${BRAND.bg};
  color: ${BRAND.text};
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased;
  overflow: hidden;
}

#stage {
  position: relative;
  width: ${STAGE_W}px;
  height: ${STAGE_H}px;
  background: ${BRAND.bg};
  overflow: hidden;
}

.serif        { font-family: 'Instrument Serif', Georgia, serif; font-style: italic; }
.sans         { font-family: 'DM Sans', -apple-system, sans-serif; }
.mono         { font-family: 'JetBrains Mono', ui-monospace, monospace; }
.mono-up      { font-family: 'JetBrains Mono', ui-monospace, monospace; text-transform: uppercase; letter-spacing: 0.12em; }

.lime         { color: ${BRAND.lime}; }
.orange       { color: ${BRAND.orange}; }
.text         { color: ${BRAND.text}; }
.muted        { color: ${BRAND.textMuted}; }
.dim          { color: ${BRAND.textDim}; }
.danger       { color: ${BRAND.danger}; }

.card {
  background: ${BRAND.bgCard};
  border: 1px solid ${BRAND.border};
  border-radius: 24px;
}

.status-bar {
  position: absolute; top: 36px; left: 48px; right: 48px;
  display: flex; justify-content: space-between;
  font-family: 'JetBrains Mono', monospace;
  font-size: 22px;
  color: ${BRAND.textMuted};
  letter-spacing: 0.08em;
}

.tag-pill {
  display: inline-flex; align-items: center; gap: 12px;
  padding: 10px 22px; border-radius: 999px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 22px; font-weight: 700; letter-spacing: 0.18em;
  border: 1px solid ${BRAND.borderMid};
}

${rendered.cssExtra ?? ""}
</style>
</head>
<body>
<div id="stage" data-width="${STAGE_W}" data-height="${STAGE_H}" data-duration="${totalS.toFixed(2)}">
${rendered.body}
</div>
${gsapTag}
<script>
(function(){
  function start(){
    var tl = gsap.timeline({
      defaults: { ease: ${JSON.stringify(EASE)}, duration: 0.6 },
      repeat: ${loop ? -1 : 0},
      repeatDelay: ${loop ? 0.5 : 0}
    });
    buildTimeline(tl);
    tl.to({}, { duration: ${HOLD_TAIL_S} });
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(start);
  } else {
    start();
  }
  function buildTimeline(tl){
    ${rendered.timeline}
  }
})();
</script>
</body>
</html>`;
}
