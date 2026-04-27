// Per-render job orchestration: render -> upload -> callback per slide,
// then a final job_done callback. Slides processed in order.
//
// Errors on a single slide DON'T abort the job -- we report the error per
// slide and keep going. The job_done callback fires only after all slides have
// been attempted.

import { renderPng, renderMp4 } from "./render.js";
import { uploadSlide } from "./upload.js";
import { callback } from "./callback.js";
import type { Slide, CarouselTemplate } from "../../src/lib/carousel/types";

export interface RenderJobInput {
  job_id: string;
  carousel_id: string;
  owner_id: string;
  mode: "static" | "animated";
  slides: Array<{
    index: number;
    template: CarouselTemplate;
    content: Record<string, unknown>;
    output_format: "png" | "mp4";
  }>;
}

export async function processRenderJob(input: RenderJobInput): Promise<void> {
  const { job_id, carousel_id, owner_id, slides } = input;
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
          ? await renderMp4({ slide, totalSlides })
          : await renderPng({ slide, totalSlides });

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
