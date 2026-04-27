import { supabase } from "@/lib/supabase";
import type { Tables, TablesUpdate } from "@/lib/database.types";
import type {
  CarouselTemplate,
  T1CoverContent,
  T2FeatureContent,
  T3GridContent,
  T4VSContent,
  T5CTAContent,
} from "@/lib/carousel/types";

export type Carousel = Tables<"carousels">;
export type CarouselSlide = Tables<"carousel_slides">;
export type CarouselUpdate = TablesUpdate<"carousels">;

export type CarouselMode = "static" | "animated";
export type CarouselStatus =
  | "draft"
  | "generating"
  | "ready"
  | "rendering"
  | "rendered"
  | "error";

export type CarouselWithSlides = Carousel & { slides: CarouselSlide[] };

/**
 * Typed view of a slide where content is the discriminated-union shape we
 * actually expect. The DB stores `content` as Json so we cast.
 */
export type TypedSlide =
  | { id: string; index: number; template: "T1Cover"; content: T1CoverContent }
  | { id: string; index: number; template: "T2Feature"; content: T2FeatureContent }
  | { id: string; index: number; template: "T3Grid"; content: T3GridContent }
  | { id: string; index: number; template: "T4VS"; content: T4VSContent }
  | { id: string; index: number; template: "T5CTA"; content: T5CTAContent };

export function asTyped(s: CarouselSlide): TypedSlide {
  return {
    id: s.id,
    index: s.index,
    template: s.template as CarouselTemplate,
    content: s.content as never,
  } as TypedSlide;
}

// ============================================================================
// Reads
// ============================================================================
export async function fetchCarousels(): Promise<Carousel[]> {
  const { data, error } = await supabase
    .from("carousels")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchCarouselWithSlides(
  id: string,
): Promise<CarouselWithSlides | null> {
  const { data: carousel, error: cErr } = await supabase
    .from("carousels")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!carousel) return null;

  const { data: slides, error: sErr } = await supabase
    .from("carousel_slides")
    .select("*")
    .eq("carousel_id", id)
    .order("index", { ascending: true });
  if (sErr) throw sErr;

  return { ...carousel, slides: slides ?? [] };
}

// ============================================================================
// Writes
// ============================================================================
export async function updateCarousel(
  id: string,
  input: CarouselUpdate,
): Promise<Carousel> {
  const { data, error } = await supabase
    .from("carousels")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCarousel(id: string): Promise<void> {
  const { error } = await supabase.from("carousels").delete().eq("id", id);
  if (error) throw error;
}

export async function duplicateCarousel(
  sourceId: string,
  ownerId: string,
): Promise<{ id: string }> {
  const source = await fetchCarouselWithSlides(sourceId);
  if (!source) throw new Error("source_not_found");

  const { data: newRow, error: cErr } = await supabase
    .from("carousels")
    .insert({
      owner_id: ownerId,
      concept: source.concept,
      title: source.title ? `${source.title} (copia)` : null,
      hook_angle: source.hook_angle,
      cta_keyword: source.cta_keyword,
      slide_count: source.slide_count,
      mode: source.mode,
      status: "ready",
    })
    .select("id")
    .single();
  if (cErr || !newRow) throw cErr ?? new Error("duplicate_insert_failed");

  if (source.slides.length > 0) {
    const slideRows = source.slides.map((s) => ({
      carousel_id: newRow.id,
      owner_id: ownerId,
      index: s.index,
      template: s.template,
      content: s.content,
      render_status: "pending" as const,
    }));
    const { error: sErr } = await supabase
      .from("carousel_slides")
      .insert(slideRows);
    if (sErr) throw sErr;
  }
  return { id: newRow.id };
}

export async function updateSlideContent(
  slideId: string,
  content: unknown,
): Promise<CarouselSlide> {
  const { data, error } = await supabase
    .from("carousel_slides")
    .update({ content: content as never })
    .eq("id", slideId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================================================
// Edge function invocations
// ============================================================================
export interface GenerateCarouselInput {
  concept: string;
  slide_count?: number;
  hook_angle?: "problem" | "contrarian" | "data" | "money_model";
  cta_keyword?: string;
  mode: CarouselMode;
}

export async function generateCarousel(input: GenerateCarouselInput): Promise<{
  carousel_id: string;
}> {
  const { data, error } = await supabase.functions.invoke<{
    carousel_id: string;
  }>("generate-carousel", { body: input });
  if (error) throw new Error(error.message ?? "generate_failed");
  if (!data?.carousel_id) throw new Error("no_carousel_id_returned");
  return data;
}

export async function regenerateSlide(input: {
  carousel_id: string;
  slide_index: number;
  instruction?: string;
}): Promise<{ template: CarouselTemplate; content: unknown }> {
  const { data, error } = await supabase.functions.invoke<{
    template: CarouselTemplate;
    content: unknown;
  }>("regenerate-carousel-slide", { body: input });
  if (error) throw new Error(error.message ?? "regen_failed");
  if (!data?.template) throw new Error("no_template_returned");
  return data;
}

export async function startCarouselRender(carousel_id: string): Promise<{
  job_id: string;
  total_slides: number;
}> {
  const { data, error } = await supabase.functions.invoke<{
    job_id: string;
    total_slides: number;
  }>("start-carousel-render", { body: { carousel_id } });
  if (error) throw new Error(error.message ?? "render_dispatch_failed");
  if (!data?.job_id) throw new Error("no_job_id_returned");
  return data;
}

/**
 * Get a 15-minute signed URL for downloading a rendered slide.
 */
export async function getSignedRenderUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("carousel-renders")
    .createSignedUrl(path, 15 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function fetchActiveRenderJob(
  carousel_id: string,
): Promise<{
  id: string;
  status: string;
  total_slides: number;
  completed_slides: number;
} | null> {
  const { data, error } = await supabase
    .from("carousel_render_jobs")
    .select("id, status, total_slides, completed_slides")
    .eq("carousel_id", carousel_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
