/**
 * Tipos compartidos entre el repo principal y el render worker para B-rolls V2.
 *
 * Mismo patrón que `src/lib/carousel/types.ts`: enum chico de templates,
 * cada uno con su shape de content. El worker importa estos tipos vía
 * `../../src/lib/broll/types` y la edge function `generate-broll` arma
 * el payload acorde.
 */

/** Templates de B-roll soportados. MVP: solo WordStack. */
export type BrollTemplate = "WordStack";

export const BROLL_TEMPLATES: readonly BrollTemplate[] = ["WordStack"];

/**
 * Content shape para `WordStack`: una lista de palabras (1-8) que
 * aparecen stackeadas verticalmente con stagger reveal.
 *
 * Ejemplo del caso real: ["CLI", "Command", "Line", "Interface"]
 */
export interface WordStackContent {
  /** Palabras a stackear. Min 1, max 8. */
  words: string[];
  /** Subtítulo opcional al pie del stack (cue del guion). */
  cueText?: string | null;
  /** Caption visual opcional (la suggestion del broll). */
  caption?: string | null;
}

/** Union discriminada por template (extender cuando se agreguen más). */
export type BrollContent = WordStackContent;

/** Slide de B-roll — análogo a `Slide` en carousel/types.ts. */
export interface BrollSlide {
  template: BrollTemplate;
  content: BrollContent;
  /** Override de duración. Si no, usa el default del template. */
  durationSeconds?: number;
}

/**
 * Configuración de estilo persistida en `broll_styles.template_code` como JSON.
 * Todos los campos son opcionales — defaults de marca aplican si vacío.
 */
export interface BrollStyleConfig {
  /** Color de fondo (hex). Default `#0a0a0a` (Eze brand bg). */
  bg?: string;
  /** Color de las palabras (hex). Default `#C8FF00` (Eze brand accent). */
  accent?: string;
  /** Tipografía heading. Default `'Instrument Serif', serif`. */
  fontHeading?: string;
  /** Stagger entre palabras en segundos. Default 0.18. */
  stagger?: number;
  /** Easing GSAP. Default `back.out(1.4)`. */
  ease?: string;
}

/** Modo de output del render. Mismo enum que carrusel. */
export type BrollMode = "static" | "animated";
