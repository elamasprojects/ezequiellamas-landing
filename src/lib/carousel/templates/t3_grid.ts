import type { T3GridContent } from "../types";
import { renderInlinePunch, escapeOnly } from "../markdown";

/**
 * T3 — 4-GRID CARDS (2×2)
 * Headline (main + accent line), exactly 4 cards (badge + title + description),
 * closing callout with concrete number / accent emphasis.
 */
export function renderT3Grid(content: T3GridContent): string {
  const { partLabel, headlineMain, headlineAccent, cards, callout } = content;
  const four = cards.slice(0, 4);
  while (four.length < 4) four.push({ badge: "", title: "", description: "" });

  return `
<style>
  .grid {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 130px 80px 130px;
  }
  .t3-headline {
    margin: 14px 0 28px;
  }
  .t3-headline .main {
    display: block;
    font-size: 56px;
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: -0.025em;
    color: var(--text);
  }
  .t3-headline .accent {
    display: block;
    font-size: 56px;
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: -0.025em;
    color: var(--accent);
    margin-top: 6px;
  }
  .t3-headline .accent .punch {
    font-size: 56px;
    line-height: 1.05;
  }

  .t3-grid {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 18px;
    margin-bottom: 24px;
  }
  .t3-card {
    background: var(--card-fill);
    border: 1px solid var(--card-border);
    border-radius: 18px;
    padding: 30px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
  }
  .t3-card .badge {
    align-self: flex-start;
    margin-bottom: 16px;
  }
  .t3-card .title {
    font-size: 30px;
    font-weight: 700;
    color: var(--text);
    line-height: 1.2;
    letter-spacing: -0.015em;
    margin-bottom: 10px;
  }
  .t3-card .desc {
    font-size: 19px;
    line-height: 1.4;
    color: var(--muted);
  }
  .t3-card .desc strong { color: var(--text); font-weight: 600; }

  .t3-callout {
    background: var(--accent-fill);
    border: 1px solid var(--accent-border);
    border-radius: 14px;
    padding: 22px 28px;
    font-size: 24px;
    font-weight: 600;
    color: var(--accent);
    line-height: 1.35;
    text-align: center;
  }
  .t3-callout strong { color: var(--text); font-weight: 700; }
</style>

<div class="grid">
  <div class="label">${escapeOnly(partLabel)}</div>
  <h2 class="t3-headline">
    <span class="main">${renderInlinePunch(headlineMain)}</span>
    <span class="accent">${renderInlinePunch(headlineAccent)}</span>
  </h2>
  <div class="t3-grid">
    ${four
      .map(
        (c) => `
      <div class="t3-card">
        ${c.badge ? `<span class="badge">${escapeOnly(c.badge)}</span>` : ""}
        <div class="title">${renderInlinePunch(c.title)}</div>
        <div class="desc">${renderInlinePunch(c.description)}</div>
      </div>
    `,
      )
      .join("")}
  </div>
  <div class="t3-callout">${renderInlinePunch(callout)}</div>
</div>
`;
}
