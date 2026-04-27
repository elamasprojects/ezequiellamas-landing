import type { T1CoverContent } from "../types";
import { renderInlinePunch, escapeOnly } from "../markdown";

/**
 * T1 — COVER (always slide 1)
 * Icon/logo top, 2-line headline (line1 sans, line2 punch), subtitle,
 * optional price comparison (strikethrough → accent pill), optional preview chips.
 */
export function renderT1Cover(content: T1CoverContent): string {
  const {
    mascotIcon = "$$",
    headlineLine1,
    headlineLine2Punch,
    subtitle,
    comparisonOld,
    comparisonNew,
    previewChips,
  } = content;

  const showCompare = !!(comparisonOld && comparisonNew);

  const compareHtml = showCompare
    ? `
    <div class="cover-comparison">
      <span class="compare-old">${escapeOnly(comparisonOld!)}</span>
      <span class="compare-arrow">→</span>
      <span class="compare-new">${escapeOnly(comparisonNew!)}</span>
    </div>
  `
    : "";

  const chipsHtml =
    previewChips && previewChips.length > 0
      ? `
    <div class="preview-row">
      ${previewChips
        .slice(0, 4)
        .map((c) => `<span class="chip">${escapeOnly(c)}</span>`)
        .join("")}
    </div>
  `
      : "";

  return `
<style>
  .cover {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 120px 80px 80px;
    text-align: center;
  }
  .cover-mascot {
    width: 96px;
    height: 96px;
    border-radius: 24px;
    background: var(--accent-fill);
    border: 1px solid var(--accent-border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: 42px;
    font-weight: 700;
    color: var(--accent);
    margin-bottom: 40px;
    filter: ${"drop-shadow(0 0 28px rgba(139,92,246,0.35))"};
  }
  .cover-headline {
    margin-bottom: 24px;
  }
  .cover-headline .line1 {
    display: block;
    font-size: 86px;
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: -0.025em;
    color: var(--text);
  }
  .cover-headline .punch {
    display: block;
    font-size: 86px;
    line-height: 1.0;
    margin-top: 12px;
  }
  .cover-sub {
    max-width: 820px;
    font-size: 26px;
    line-height: 1.4;
    color: var(--muted);
    margin-bottom: 48px;
  }
  .cover-sub strong {
    color: var(--text);
    font-weight: 600;
  }
  .cover-comparison {
    display: inline-flex;
    align-items: center;
    gap: 16px;
    font-size: 30px;
    font-weight: 600;
    margin-bottom: 56px;
  }
  .cover-comparison .compare-arrow {
    color: var(--muted);
    font-size: 28px;
  }
  .preview-row {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: center;
  }
  .preview-row .chip {
    display: inline-flex;
    align-items: center;
    padding: 8px 16px;
    border: 1px solid var(--card-border);
    background: var(--card-fill);
    border-radius: 999px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    color: var(--muted);
    letter-spacing: 0.05em;
  }
</style>

<div class="cover">
  <div class="cover-mascot">${escapeOnly(mascotIcon)}</div>
  <h1 class="cover-headline">
    <span class="line1">${renderInlinePunch(headlineLine1)}</span>
    <span class="punch">${escapeOnly(headlineLine2Punch)}</span>
  </h1>
  <p class="cover-sub">${renderInlinePunch(subtitle)}</p>
  ${compareHtml}
  ${chipsHtml}
</div>
`;
}
