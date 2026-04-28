import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

export type CarouselReference = Database["public"]["Tables"]["carousel_references"]["Row"];

export interface CarouselReferenceSlide {
  index: number;
  storage_path: string | null;
  extracted_text: string;
  visual_description: string;
}

interface ScrapeOk {
  reference: CarouselReference;
  cached: boolean;
}

interface ScrapeErr {
  error: string;
  reference_id?: string;
}

export async function scrapeCarouselReference(input: {
  url: string;
  force?: boolean;
}): Promise<ScrapeOk> {
  const { data, error } = await supabase.functions.invoke<ScrapeOk | ScrapeErr>(
    "scrape-carousel-reference",
    { body: input },
  );
  if (error) {
    const ctx = (error as { context?: { error?: string } }).context;
    const msg = ctx?.error ?? error.message ?? "scrape-carousel-reference failed";
    throw new Error(msg);
  }
  if (!data) throw new Error("Empty response");
  if ("error" in data) throw new Error(data.error);
  return data;
}

export async function getCarouselReference(id: string): Promise<CarouselReference> {
  const { data, error } = await supabase
    .from("carousel_references")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Returns a 15-minute signed URL for displaying a scraped slide image
 * (bucket carousel-reference-slides, private).
 */
export async function getSignedSlideUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("carousel-reference-slides")
    .createSignedUrl(storagePath, 15 * 60);
  if (error) throw error;
  return data.signedUrl;
}

/**
 * Builds the auto-populated concept text for the NewCarousel textarea.
 * Format: synthesized concept + per-slide breakdown with dividers.
 */
export function buildAutoConceptText(reference: CarouselReference): string {
  const slides = (reference.slides as CarouselReferenceSlide[] | null) ?? [];
  const sorted = [...slides].sort((a, b) => a.index - b.index);

  const header = reference.concept?.trim() ?? "(sin concepto)";
  const sections = sorted.map((s) => {
    const lines = [`--- Slide ${s.index + 1} ---`];
    if (s.extracted_text && s.extracted_text.trim() !== "(sin texto)") {
      lines.push(`Texto: ${s.extracted_text.trim()}`);
    } else {
      lines.push("Texto: (sin texto)");
    }
    if (s.visual_description && s.visual_description.trim().length > 0) {
      lines.push(`Visual: ${s.visual_description.trim()}`);
    }
    return lines.join("\n");
  });

  return [header, "", ...sections].join("\n\n");
}
