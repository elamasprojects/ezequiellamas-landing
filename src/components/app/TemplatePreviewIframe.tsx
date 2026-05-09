/**
 * TemplatePreviewIframe — sandboxed live preview of a motion graphic template.
 *
 * Builds the same HTML the worker produces (same shell + same template
 * registry) but in "preview" mode (Google Fonts CDN + GSAP CDN + auto-loop).
 * The 1080x1920 stage is rendered inside an iframe scaled down to the `width`
 * the parent passes. Sandbox is `allow-scripts` only — no network access to
 * the parent and no cookies.
 *
 * Lazy-loaded via IntersectionObserver: doesn't render the iframe until the
 * card scrolls into view, so a page with 24 templates doesn't spin up 24
 * GSAP timelines on mount.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { buildMotionGraphicHtml, STAGE_H, STAGE_W } from "@/lib/motion-graphics/shell";
import { renderTemplate, sampleSlotsFor } from "@/lib/motion-graphics/templates";

interface TemplatePreviewIframeProps {
  templateSlug: string;
  durationS: number;
  /** Custom slots. Defaults to SAMPLE_SLOTS[slug] from the templates module. */
  filledSlots?: Record<string, unknown>;
  /** Display width in px. Height auto-derived as width × (1920/1080) ≈ 1.78. */
  width: number;
  /** Lazy-load via IntersectionObserver. Default true. */
  lazy?: boolean;
  className?: string;
}

export function TemplatePreviewIframe({
  templateSlug,
  durationS,
  filledSlots,
  width,
  lazy = true,
  className,
}: TemplatePreviewIframeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(!lazy);

  useEffect(() => {
    if (!lazy || shouldLoad || !containerRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShouldLoad(true);
            obs.disconnect();
            return;
          }
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [lazy, shouldLoad]);

  const html = useMemo(() => {
    if (!shouldLoad) return null;
    const slots = filledSlots ?? sampleSlotsFor(templateSlug);
    const rendered = renderTemplate(templateSlug, slots);
    return buildMotionGraphicHtml({
      templateSlug,
      durationS,
      rendered,
      outputMode: "preview",
      loop: true,
    });
  }, [shouldLoad, templateSlug, durationS, filledSlots]);

  const scale = width / STAGE_W;
  const height = Math.round(width * (STAGE_H / STAGE_W));

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width,
        height,
        overflow: "hidden",
        background: "#0a0a0a",
        borderRadius: 8,
        position: "relative",
        flexShrink: 0,
      }}
    >
      {!shouldLoad ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#5a5550",
          }}
        >
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : (
        <iframe
          srcDoc={html ?? ""}
          sandbox="allow-scripts"
          title={`Preview ${templateSlug}`}
          style={{
            width: STAGE_W,
            height: STAGE_H,
            border: "none",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            display: "block",
          }}
        />
      )}
    </div>
  );
}
