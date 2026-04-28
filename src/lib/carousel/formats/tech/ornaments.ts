/**
 * Tech format — grain texture overlay using inline SVG noise.
 */
export const ornaments = `
<div class="format-ornaments" aria-hidden="true" style="
  position:absolute;inset:0;pointer-events:none;z-index:0;
  background-image:url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.18 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\");
  opacity:0.55;mix-blend-mode:screen;
"></div>
`;
