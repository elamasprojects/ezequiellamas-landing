/**
 * Tipos compartidos entre el repo principal y el render worker para B-rolls V2.
 *
 * Templates organizados en 4 categorías (igual que Hyperframes Studio):
 *   - text-animation: WordStack, Typewriter
 *   - posters:        AcronymReveal, BoldStatement
 *   - infographics:   BarGrowth, StatCounter
 *   - presentation:   BulletList, QuoteCard
 *
 * Cada template recibe el mismo `BrollContent` permissive y picks lo que
 * necesita. Los templates más estructurados (BarGrowth, StatCounter) parsean
 * `raw` JSON cuando el user provee data específica.
 */

export type BrollCategory =
  | "text-animation"
  | "posters"
  | "infographics"
  | "presentation";

export type BrollTemplate =
  | "WordStack"
  | "Typewriter"
  | "AcronymReveal"
  | "BoldStatement"
  | "BarGrowth"
  | "StatCounter"
  | "BulletList"
  | "QuoteCard";

export const BROLL_TEMPLATES: readonly BrollTemplate[] = [
  "WordStack",
  "Typewriter",
  "AcronymReveal",
  "BoldStatement",
  "BarGrowth",
  "StatCounter",
  "BulletList",
  "QuoteCard",
];

export const TEMPLATE_CATEGORY: Record<BrollTemplate, BrollCategory> = {
  WordStack: "text-animation",
  Typewriter: "text-animation",
  AcronymReveal: "posters",
  BoldStatement: "posters",
  BarGrowth: "infographics",
  StatCounter: "infographics",
  BulletList: "presentation",
  QuoteCard: "presentation",
};

export const TEMPLATE_LABEL: Record<BrollTemplate, string> = {
  WordStack: "Word Stack",
  Typewriter: "Typewriter",
  AcronymReveal: "Acronym Reveal",
  BoldStatement: "Bold Statement",
  BarGrowth: "Bar Growth",
  StatCounter: "Stat Counter",
  BulletList: "Bullet List",
  QuoteCard: "Quote Card",
};

export const TEMPLATE_DESCRIPTION: Record<BrollTemplate, string> = {
  WordStack: "Palabras stackeadas verticales con stagger reveal",
  Typewriter: "Frase apareciendo letra por letra con cursor blink",
  AcronymReveal: "Siglas verticales con su definición horizontal",
  BoldStatement: "Frase punzante con palabra clave en accent",
  BarGrowth: "Barras horizontales creciendo con stagger",
  StatCounter: "Número grande contando hasta el valor final",
  BulletList: "Lista de bullets con stagger reveal",
  QuoteCard: "Quote en serif italic con atribución",
};

/**
 * Content permissive — cada template extrae lo que necesita. La edge function
 * mapea los campos del `broll_suggestions` row a esta forma sin transformación
 * (suggestion → text, selected_words → words, cue_text → cueText, etc).
 */
export interface BrollContent {
  /** Texto principal del broll. Default: `broll.suggestion`. */
  text?: string | null;
  /** Lista de items (palabras, definiciones, bullets). Default: `selected_words`. */
  words?: string[] | null;
  /** Subtítulo / cue inferior. Default: `broll.cue_text`. */
  cueText?: string | null;
  /** Descripción visual extendida. Default: `broll.image_description`. */
  caption?: string | null;
  /** Descripción de animación. Default: `broll.animation_description`. */
  animationDescription?: string | null;
  /** Para templates que necesitan data estructurada (BarGrowth bars, StatCounter value) */
  raw?: Record<string, unknown> | null;
}

export interface BrollSlide {
  template: BrollTemplate;
  content: BrollContent;
  durationSeconds?: number;
}

export interface BrollStyleConfig {
  bg?: string;
  accent?: string;
  /** Color secundario (warm orange #ff6b35 o blue #4a9eff). */
  secondary?: string;
  fontHeading?: string;
  fontBody?: string;
  fontMono?: string;
  stagger?: number;
  ease?: string;
}

export type BrollMode = "static" | "animated";
