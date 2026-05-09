// Shared HTML+CSS+GSAP shell for the motion graphic templates.
// Each template returns a body fragment + a GSAP timeline body. The shell
// wraps them in a 1080x1920 stage with the brand fonts loaded inline (so
// Hyperframes doesn't have to fetch from a CDN), the loop set to 5.5s, and
// the cinematic ease applied as the timeline default.
//
// NOTE on Hyperframes: it expects an `<div data-width="W" data-height="H">`
// somewhere in the document and will use that as the producer viewport.
// Animations run via a `<script src="./gsap.min.js">` that the worker copies
// into the tmp dir before invoking the CLI.

import { brandFontFaces } from "../fonts.js";

export const STAGE_W = 1080;
export const STAGE_H = 1920;
export const LOOP_S = 5.5;          // canonical loop duration
export const HOLD_TAIL_S = 1.0;     // freeze the final frame for 1s

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

// Cinematic ease used everywhere. GSAP's "power2.out" is the closest match to
// the spec's `cubic-bezier(.22, 1, .36, 1)` — same shape, same feel.
export const EASE = "power2.out";

// Some templates render TEXT into a slot value. Collapse to safe HTML to avoid
// surprise injection. We trust the agent + the admin (filled_slots is RLS
// scoped) but escape anyway since slot values flow into innerHTML strings.
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
  body: string;       // inner HTML for the stage (everything inside <div id="stage">)
  timeline: string;   // JS body for `function buildTimeline(tl){ ... }` — gets `tl` as the GSAP tl
  cssExtra?: string;  // optional extra CSS appended to the global block
}

export interface BuildHtmlOptions {
  templateSlug: string;
  durationS: number;  // duration coming from the template metadata
  rendered: RenderedTemplate;
}

export function buildMotionGraphicHtml(opts: BuildHtmlOptions): string {
  const { templateSlug, durationS, rendered } = opts;
  // Loop length is fixed at 5.5s by the spec, but the template's own visible
  // motion happens within `durationS`. After that we hold the final frame for
  // HOLD_TAIL_S so the MP4 ends gracefully.
  const totalS = Math.max(durationS + HOLD_TAIL_S, LOOP_S);

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${escHtml(templateSlug)}</title>
<style>
${brandFontFaces()}

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
<div id="stage" data-width="${STAGE_W}" data-height="${STAGE_H}">
${rendered.body}
</div>
<script src="./gsap.min.js"></script>
<script>
(function(){
  // Wait for fonts so the first paint already has Instrument Serif + DM Sans.
  document.fonts.ready.then(function(){
    var tl = gsap.timeline({
      defaults: { ease: ${JSON.stringify(EASE)}, duration: 0.6 }
    });
    buildTimeline(tl);
    // Hold the final state for HOLD_TAIL_S.
    tl.to({}, { duration: ${HOLD_TAIL_S} });
    // The total duration of the produced MP4 is set by Hyperframes via the
    // overall <div data-duration> attribute — we let it default to the
    // timeline length above. Hyperframes auto-detects.
  });

  function buildTimeline(tl){
    ${rendered.timeline}
  }
})();
</script>
</body>
</html>`;
}
