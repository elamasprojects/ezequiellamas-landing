import type { T2FeatureContent } from "../types";
import { renderInlinePunch, escapeOnly } from "../markdown";

/**
 * T2 — SINGLE FEATURE / CONCEPT
 * Label badge (PARTE 0X), optional logo+title+pricerow with strikethrough,
 * context text, big card with header + title (with optional inline punch) + bullets.
 */
export function renderT2Feature(content: T2FeatureContent): string {
  const {
    partLabel,
    iconText,
    title,
    priceRow,
    contextText,
    cardHeader,
    cardTitle,
    cardBullets,
  } = content;

  const hasIconRow = !!(iconText || title);

  const iconRowHtml = hasIconRow
    ? `
    <div class="feature-iconrow">
      ${iconText ? `<span class="feature-icon">${escapeOnly(iconText)}</span>` : ""}
      ${title ? `<span class="feature-title">${renderInlinePunch(title)}</span>` : ""}
    </div>
  `
    : "";

  const priceRowHtml =
    priceRow && priceRow.length > 0
      ? `
    <div class="feature-pricerow">
      ${priceRow
        .map(
          (p) => `
        <span class="compare-old">${escapeOnly(p.old)}</span>
        <span class="compare-arrow">→</span>
        <span class="compare-new">${escapeOnly(p.new)}</span>
      `,
        )
        .join('<span class="compare-sep">·</span>')}
    </div>
  `
      : "";

  const contextHtml = contextText
    ? `<p class="feature-context">${renderInlinePunch(contextText)}</p>`
    : "";

  const bulletsHtml = `
    <ul class="bullets">
      ${cardBullets
        .map(
          (b) =>
            `<li class="${b.type === "negative" ? "neg" : ""}">${renderInlinePunch(b.text)}</li>`,
        )
        .join("")}
    </ul>
  `;

  return `
<style>
  .feature {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 130px 80px 130px;
  }
  .feature-iconrow {
    display: flex;
    align-items: center;
    gap: 18px;
    margin: 16px 0 12px;
  }
  .feature-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: var(--accent-fill);
    border: 1px solid var(--accent-border);
    font-family: 'JetBrains Mono', monospace;
    font-size: 22px;
    font-weight: 700;
    color: var(--accent);
  }
  .feature-title {
    font-size: 38px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.02em;
  }
  .feature-pricerow {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    font-size: 24px;
    font-weight: 500;
    margin-bottom: 28px;
  }
  .feature-pricerow .compare-arrow,
  .feature-pricerow .compare-sep {
    color: var(--muted);
  }
  .feature-context {
    font-size: 26px;
    line-height: 1.4;
    color: var(--muted);
    max-width: 880px;
    margin-bottom: 36px;
  }
  .feature-context strong { color: var(--text); font-weight: 600; }

  .feature-card {
    background: var(--card-fill);
    border: 1px solid var(--card-border);
    border-radius: 24px;
    padding: 44px;
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .feature-card-header {
    font-family: 'JetBrains Mono', monospace;
    font-size: 16px;
    font-weight: 600;
    color: var(--accent);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    margin-bottom: 22px;
  }
  .feature-card-title {
    font-size: 56px;
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -0.025em;
    color: var(--text);
    margin-bottom: 28px;
  }
  .feature-card-title .punch {
    font-size: 56px;
    line-height: 1.1;
  }
  .feature-card .bullets li {
    font-size: 24px;
    margin-bottom: 12px;
  }
</style>

<div class="feature">
  <div class="label">${escapeOnly(partLabel)}</div>
  ${iconRowHtml}
  ${priceRowHtml}
  ${contextHtml}
  <div class="feature-card">
    <div class="feature-card-header">${escapeOnly(cardHeader)}</div>
    <div class="feature-card-title">${renderInlinePunch(cardTitle)}</div>
    ${bulletsHtml}
  </div>
</div>
`;
}
