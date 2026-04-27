import type { T5CTAContent } from "../types";
import { escapeOnly, renderInlinePunch } from "../markdown";

/**
 * T5 — CTA FINAL (always last slide)
 * Big headline, subtitle, GIANT keyword in serif italic accent + glow,
 * 4 mono pill tags, signature card at bottom.
 */
export function renderT5CTA(content: T5CTAContent): string {
  const { headline, subtitle, keyword, tags, signatureText } = content;
  const fourTags = tags.slice(0, 4);

  return `
<style>
  .cta {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 120px 80px 80px;
    text-align: center;
  }
  .cta-headline {
    font-size: 38px;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.02em;
    color: var(--text);
    text-transform: uppercase;
    max-width: 880px;
    margin-bottom: 24px;
  }
  .cta-sub {
    font-size: 22px;
    line-height: 1.4;
    color: var(--muted);
    max-width: 760px;
    margin-bottom: 48px;
  }
  .cta-sub strong { color: var(--text); font-weight: 600; }

  .cta-keyword {
    font-family: 'Playfair Display', 'Georgia', serif;
    font-style: italic;
    font-weight: 700;
    color: var(--accent);
    filter: drop-shadow(0 0 32px rgba(139,92,246,0.65));
    font-size: 140px;
    line-height: 1.0;
    letter-spacing: -0.03em;
    margin: 12px 0 56px;
    word-break: break-word;
  }

  .cta-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: center;
    margin-bottom: 52px;
  }
  .cta-tag {
    display: inline-flex;
    align-items: center;
    padding: 10px 18px;
    border: 1px solid var(--accent-border);
    background: var(--accent-fill);
    border-radius: 999px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    font-weight: 600;
    color: var(--accent);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .cta-signature {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px 28px;
    border: 1px solid var(--card-border);
    background: var(--card-fill);
    border-radius: 999px;
    max-width: 600px;
    margin: 0 auto;
  }
  .cta-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent), #6d28d9);
    flex-shrink: 0;
  }
  .cta-signature-text {
    font-size: 16px;
    color: var(--muted);
    text-align: left;
    line-height: 1.35;
  }
  .cta-signature-text strong { color: var(--text); font-weight: 600; }
</style>

<div class="cta">
  <div class="cta-headline">${escapeOnly(headline)}</div>
  <p class="cta-sub">${renderInlinePunch(subtitle)}</p>
  <div class="cta-keyword">${escapeOnly(keyword)}</div>
  <div class="cta-tags">
    ${fourTags.map((t) => `<span class="cta-tag">${escapeOnly(t)}</span>`).join("")}
  </div>
  <div class="cta-signature">
    <div class="cta-avatar"></div>
    <div class="cta-signature-text">${renderInlinePunch(signatureText)}</div>
  </div>
</div>
`;
}
