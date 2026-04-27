/**
 * Tiny markdown parser for inline carousel copy.
 *
 * Supports:
 *   `**texto**` -> <strong>texto</strong>            (white emphasis, font-weight 600)
 *   `*texto*`   -> <em class="punch">texto</em>      (serif italic accent + glow)
 *
 * Escape rules:
 *   - HTML in input is escaped first (no raw HTML allowed in carousel copy)
 *   - To render a literal asterisk, use `\*` (backslash-escape)
 *
 * Rationale: the v2.2 spec writes punch lines inline ("aca viene *Construilas.*").
 * Rather than expand JSON schema with explicit prefix/punch/suffix triples,
 * we treat copy as a single string and parse on render -- matching how Claude
 * naturally writes the output and keeping editor UI simple (one textarea).
 */

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]!);
}

// Private Unicode placeholder for backslash-escaped asterisks during parsing.
// U+E000 is in the Private Use Area, so it never collides with normal input.
const ESC_ASTERISK = "";

/**
 * Render inline markdown for carousel copy. Returns escaped HTML.
 * Order matters: `**` must be parsed before `*` so that `**foo**` does not
 * become `<em><em>foo</em></em>`.
 */
export function renderInlinePunch(input: string): string {
  // 1. Stash `\*` behind a placeholder so the literal asterisks survive parsing.
  const stashed = input.replace(/\\\*/g, ESC_ASTERISK);

  // 2. HTML-escape the stashed string.
  let html = escapeHtml(stashed);

  // 3. **bold** -> <strong>
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // 4. *punch* -> <em class="punch">
  html = html.replace(/\*([^*]+)\*/g, '<em class="punch">$1</em>');

  // 5. Restore literal asterisks from placeholders.
  html = html.split(ESC_ASTERISK).join("*");

  return html;
}

/**
 * Pure HTML escape, no markdown -- useful for fields where punch is forbidden
 * (e.g. T5 keyword which is the WHOLE thing in serif italic).
 */
export function escapeOnly(input: string): string {
  return escapeHtml(input);
}
