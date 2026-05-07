// Per-job orchestration. Two job types share this file:
//
//   - processCarouselJob: per-slide render -> upload -> callback. Errors per slide
//     don't abort the whole job; final job_done/job_error always fires.
//
//   - processBrollJob: single MP4 render -> upload -> sign URL -> callback. Errors
//     fire a single error callback.

import { renderPng, renderMp4, renderBrollMp4 } from "./render.js";
import { uploadSlide, uploadBroll, signBrollUrl } from "./upload.js";
import { callback, brollCallback } from "./callback.js";
import { admin } from "./db.js";
import type { Slide, CarouselTemplate } from "../../src/lib/carousel/types";
import type { FormatSlug } from "../../src/lib/carousel/formats";
import type { BrollTemplate, WordStackContent } from "../../src/lib/broll/types";
import { parseBrollStyleConfig } from "../../src/lib/broll/style-config";

// ─── Carousel ───────────────────────────────────────────────────────────────

export interface CarouselJobInput {
  kind: "carousel";
  job_id: string;
  carousel_id: string;
  owner_id: string;
  mode: "static" | "animated";
  design_format: FormatSlug;
  slides: Array<{
    index: number;
    template: CarouselTemplate;
    content: Record<string, unknown>;
    output_format: "png" | "mp4";
  }>;
}

export async function processCarouselJob(input: CarouselJobInput): Promise<void> {
  const { job_id, carousel_id, owner_id, slides, design_format } = input;
  const totalSlides = slides.length;
  let hadError = false;

  for (const item of slides) {
    const slide: Slide = {
      index: item.index,
      template: item.template,
      // Cast: each template has its own content shape but the union covers them
      content: item.content as never,
    };
    try {
      const buffer =
        item.output_format === "mp4"
          ? await renderMp4({ slide, totalSlides, design_format })
          : await renderPng({ slide, totalSlides, design_format });

      const rendered_path = await uploadSlide({
        ownerId: owner_id,
        carouselId: carousel_id,
        index: item.index,
        format: item.output_format,
        buffer,
      });

      await callback({
        job_id,
        slide_index: item.index,
        status: "done",
        rendered_path,
        rendered_format: item.output_format,
      });
    } catch (err) {
      hadError = true;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[job=${job_id} slide=${item.index}] error:`, msg);
      try {
        await callback({
          job_id,
          slide_index: item.index,
          status: "error",
          error: msg,
        });
      } catch (cbErr) {
        console.error("callback failed:", cbErr);
      }
    }
  }

  // Final job-level callback
  try {
    await callback(
      hadError
        ? { job_id, status: "job_error", error: "one_or_more_slides_failed" }
        : { job_id, status: "job_done" },
    );
  } catch (err) {
    console.error("final job callback failed:", err);
  }
}

// ─── B-roll ─────────────────────────────────────────────────────────────────

export interface BrollJobInput {
  kind: "broll";
  broll_suggestion_id: string;
  owner_id: string;
  template: BrollTemplate;
  content: Record<string, unknown>;
  style_id: string | null;
  style_template_code: string | null;
  output_format: "mp4";
}

export async function processBrollJob(input: BrollJobInput): Promise<void> {
  const { broll_suggestion_id, owner_id, template, content, style_template_code } = input;

  try {
    // 1) Marcar processing (RLS bypass via service role).
    await admin()
      .from("broll_suggestions")
      .update({ generation_status: "processing", generation_error: null })
      .eq("id", broll_suggestion_id);

    // 2) Render. El cast a WordStackContent es seguro mientras solo exista
    //    "WordStack"; cuando agreguemos templates, hacer un narrow por template.
    const styleConfig = parseBrollStyleConfig(style_template_code);
    const buffer = await renderBrollMp4({
      template,
      // Cast via unknown — the worker's zod schema validates `content` is
      // a record; per-template shape narrowing happens here. When more
      // templates land, switch on `template` to pick the right narrow cast.
      content: content as unknown as WordStackContent,
      styleConfig,
    });

    // 3) Upload a broll-renders/{owner_id}/{broll_id}.mp4
    const path = await uploadBroll({
      ownerId: owner_id,
      brollId: broll_suggestion_id,
      ext: "mp4",
      buffer,
    });

    // 4) Signed URL (30d) — el frontend la guarda en broll_suggestions.output_url.
    const signed_url = await signBrollUrl(path);

    // 5) Callback HMAC done — la edge actualiza generation_status='done',
    //    output_url=signed_url, output_type='video'.
    await brollCallback({
      broll_suggestion_id,
      status: "done",
      rendered_path: path,
      signed_url,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[broll=${broll_suggestion_id}] error:`, msg);
    try {
      await brollCallback({
        broll_suggestion_id,
        status: "error",
        error: msg.slice(0, 1000),
      });
    } catch (cbErr) {
      console.error("broll callback failed:", cbErr);
    }
  }
}
