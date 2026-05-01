/**
 * Discriminated union of carousel slide content.
 * Each template renders a different shape; the `template` field on the parent
 * carousel_slides row is the discriminator.
 *
 * Markdown supported in copy fields:
 *   `**bold**` → <strong>...</strong> (white emphasis)
 *   `*texto*`  → <em class="punch">...</em> (serif italic accent + glow)
 *
 * See markdown.ts for the parser.
 */

export type CarouselTemplate = "T1Cover" | "T2Feature" | "T3Grid" | "T4VS" | "T5CTA";

export type CarouselMode = "static" | "animated";

/**
 * T1 — COVER (always slide 1)
 * Icon centered top, 2-line headline (line1 sans, line2 punch),
 * subtitle, optional comparison ($X strikethrough → $0 accent pill),
 * optional preview chips at the bottom.
 */
export interface T1CoverContent {
  mascotIcon?: string;          // 1-3 chars or emoji, default "$$"
  headlineLine1: string;        // sans bold white
  headlineLine2Punch: string;   // serif italic accent + glow (no markdown — always punch)
  subtitle: string;             // markdown allowed
  comparisonOld?: string;       // e.g. "$30/mes" — strikethrough pill
  comparisonNew?: string;       // e.g. "$0 con Notion" — accent pill
  previewChips?: string[];      // up to 4 mono chips (small previews of what's inside)
}

/**
 * T2 — SINGLE FEATURE / CONCEPT
 * Label badge, optional logo+name+pricerow with strikethrough,
 * context text, big card with header + title (with optional inline punch) + bullets.
 */
export interface T2FeatureContent {
  partLabel: string;            // "PARTE 01" / "DATO 01" / "TOOL 01"
  iconText?: string;            // 1-2 chars in mono (mini logo)
  title?: string;               // optional big title (the tool/concept name)
  priceRow?: { old: string; new: string }[];
  contextText?: string;         // markdown allowed (1-2 lines, what hurts)
  cardHeader: string;           // "> LO QUE [...]"  (mono accent)
  cardTitle: string;            // markdown — wrap a word in *texto* for serif punch
  cardBullets: { text: string; type: "positive" | "negative" }[];
}

/**
 * T3 — 4-GRID CARDS (2×2)
 * Headline (2 lines: main + accent), grid of exactly 4 cards
 * (badge + title + 1-line description), closing callout.
 */
export interface T3GridContent {
  partLabel: string;
  headlineMain: string;         // sans bold white
  headlineAccent: string;       // accent or punch
  cards: T3GridCard[];          // exactly 4
  callout: string;              // markdown — wrap accent emphasis in **bold** or *punch*
}

export interface T3GridCard {
  badge: string;                // "//" / "KB" / "MD" / "$0" / "DB" / "TX" / "%%" / ">_" / "RD"
  title: string;
  description: string;
}

/**
 * T4 — VS COMPARISON
 * Headline, two columns with circular VS badge in the middle.
 * Left = problem (x bullets), right = solution (> bullets accent).
 */
export interface T4VSContent {
  partLabel: string;
  headline: string;             // 1-2 lines, can be markdown
  leftLabel: string;            // "LO QUE PAGÁS" / "CÓMO LO HACEN"
  leftTitle: string;
  leftBullets: string[];        // 4-6 items
  leftFooterLines?: string[];   // bold mono lines at bottom (totals, etc.)
  rightLabel: string;           // "[TU APROACH]"
  rightTitlePrefix: string;     // sans (e.g. "Construir")
  rightTitlePunch: string;      // serif italic accent (e.g. "lo tuyo")
  rightBullets: string[];
  rightFooterLines?: string[];
}

/**
 * T5 — CTA FINAL (always last slide)
 * Big headline, subtitle, GIANT keyword in serif italic accent,
 * 4 mono pill tags, signature card at bottom.
 */
export interface T5CTAContent {
  headline: string;             // "COMENTÁ ABAJO Y TE LO MANDO POR DM" (sans bold white, no markdown)
  subtitle: string;             // 1-2 lines
  keyword: string;              // becomes giant serif italic, no quotes
  tags: string[];               // exactly 4 mono pill tags (categories covered)
  signatureText: string;        // tagline at bottom card
}

/**
 * Discriminated union — what's stored in carousel_slides.content (jsonb).
 */
export type SlideContent =
  | { template: "T1Cover"; content: T1CoverContent }
  | { template: "T2Feature"; content: T2FeatureContent }
  | { template: "T3Grid"; content: T3GridContent }
  | { template: "T4VS"; content: T4VSContent }
  | { template: "T5CTA"; content: T5CTAContent };

/**
 * Slide as stored, with index and template-typed content.
 */
export interface Slide {
  index: number;                // 0-based
  template: CarouselTemplate;
  content:
    | T1CoverContent
    | T2FeatureContent
    | T3GridContent
    | T4VSContent
    | T5CTAContent;
}

/**
 * Per-slide render context (top bar, mode, etc.)
 */
export interface RenderOpts {
  totalSlides: number;
  mode: CarouselMode;
  handle?: string;              // defaults to "@ezequiellamass"
}
