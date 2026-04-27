import type { T4VSContent } from "../types";
import { renderInlinePunch, escapeOnly } from "../markdown";

/**
 * T4 — VS COMPARISON
 * Headline, two columns separated by circular VS badge.
 * Left column = problem (x bullets red), right column = solution (> bullets accent).
 */
export function renderT4VS(content: T4VSContent): string {
  const {
    partLabel,
    headline,
    leftLabel,
    leftTitle,
    leftBullets,
    leftFooterLines,
    rightLabel,
    rightTitlePrefix,
    rightTitlePunch,
    rightBullets,
    rightFooterLines,
  } = content;

  const renderFooter = (lines?: string[]) =>
    lines && lines.length > 0
      ? `
    <div class="t4-footer-lines">
      ${lines
        .map((l) => `<div class="t4-footer-line">${renderInlinePunch(l)}</div>`)
        .join("")}
    </div>
  `
      : "";

  return `
<style>
  .vs {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 130px 60px 130px;
  }
  .t4-headline {
    margin: 14px 0 28px;
    text-align: center;
    font-size: 42px;
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: -0.02em;
    color: var(--text);
  }
  .t4-headline .punch { font-size: 42px; }
  .t4-headline strong { color: var(--text); font-weight: 700; }

  .t4-cols {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: stretch;
    gap: 22px;
    position: relative;
  }
  .t4-col {
    background: var(--card-fill);
    border: 1px solid var(--card-border);
    border-radius: 18px;
    padding: 28px;
    display: flex;
    flex-direction: column;
  }
  .t4-col.right {
    border-color: var(--accent-border);
    background: rgba(139,92,246,0.05);
  }
  .t4-col-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 12px;
  }
  .t4-col.right .t4-col-label { color: var(--accent); }
  .t4-col-title {
    font-size: 30px;
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: -0.015em;
    color: var(--text);
    margin-bottom: 18px;
  }
  .t4-col.right .t4-col-title .punch { font-size: 30px; }
  .t4-col .bullets li {
    font-size: 20px;
    margin-bottom: 10px;
    line-height: 1.35;
  }

  .t4-divider {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .t4-vs-badge {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--bg);
    border: 2px solid var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: 18px;
    font-weight: 700;
    color: var(--accent);
    letter-spacing: 0.05em;
    filter: drop-shadow(0 0 24px rgba(139,92,246,0.5));
  }

  .t4-footer-lines {
    margin-top: auto;
    padding-top: 18px;
    border-top: 1px dashed var(--card-border);
  }
  .t4-footer-line {
    font-family: 'JetBrains Mono', monospace;
    font-size: 16px;
    font-weight: 600;
    color: var(--text);
    letter-spacing: 0.02em;
    margin-top: 6px;
  }
  .t4-col.right .t4-footer-line { color: var(--accent); }
</style>

<div class="vs">
  <div class="label" style="text-align: center;">${escapeOnly(partLabel)}</div>
  <h2 class="t4-headline">${renderInlinePunch(headline)}</h2>
  <div class="t4-cols">
    <div class="t4-col left">
      <div class="t4-col-label">${escapeOnly(leftLabel)}</div>
      <div class="t4-col-title">${renderInlinePunch(leftTitle)}</div>
      <ul class="bullets x">
        ${leftBullets.map((b) => `<li>${renderInlinePunch(b)}</li>`).join("")}
      </ul>
      ${renderFooter(leftFooterLines)}
    </div>
    <div class="t4-divider"><div class="t4-vs-badge">VS</div></div>
    <div class="t4-col right">
      <div class="t4-col-label">${escapeOnly(rightLabel)}</div>
      <div class="t4-col-title">
        ${escapeOnly(rightTitlePrefix)} <span class="punch">${escapeOnly(rightTitlePunch)}</span>
      </div>
      <ul class="bullets">
        ${rightBullets.map((b) => `<li>${renderInlinePunch(b)}</li>`).join("")}
      </ul>
      ${renderFooter(rightFooterLines)}
    </div>
  </div>
</div>
`;
}
