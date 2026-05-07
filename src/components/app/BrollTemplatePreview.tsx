/**
 * BrollTemplatePreview — iframe con la animación del template ejecutándose
 * en loop. Usa el outputMode "preview" de buildBrollHtml: GSAP via CDN +
 * Google Fonts via CDN + auto-play + repeat.
 *
 * Renderiza el HTML 720×1280 dentro de un iframe scaled-down al `width`
 * que pase el padre. El iframe es sandboxed (allow-scripts) — no tiene
 * acceso al DOM del parent ni a cookies, solo ejecuta su JS interno.
 */

import { useMemo, useState, useEffect, useRef } from "react";
import { buildBrollHtml } from "@/lib/broll/render";
import { SAMPLE_CONTENT } from "@/lib/broll/sample";
import { SLIDE_WIDTH, SLIDE_HEIGHT } from "@/lib/broll/design-tokens";
import type {
  BrollTemplate,
  BrollStyleConfig,
  BrollContent,
} from "@/lib/broll/types";
import { Loader2 } from "lucide-react";

interface BrollTemplatePreviewProps {
  template: BrollTemplate;
  /** Override de paleta/timing del estilo (parsed JSON de template_code). */
  styleConfig?: BrollStyleConfig;
  /** Content custom. Si no se pasa, usa SAMPLE_CONTENT[template]. */
  content?: BrollContent;
  /** Display width en px. Height = width × (1280/720) = width × 1.78. */
  width: number;
  className?: string;
  /** Si true, lazy-load via IntersectionObserver (default: true). */
  lazy?: boolean;
}

export default function BrollTemplatePreview({
  template,
  styleConfig = {},
  content,
  width,
  className,
  lazy = true,
}: BrollTemplatePreviewProps) {
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
      { rootMargin: "100px" },
    );
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [lazy, shouldLoad]);

  const html = useMemo(() => {
    if (!shouldLoad) return null;
    return buildBrollHtml(
      { template, content: content ?? SAMPLE_CONTENT[template] },
      { outputMode: "preview", styleConfig },
    );
  }, [shouldLoad, template, content, styleConfig]);

  const scale = width / SLIDE_WIDTH;
  const height = Math.round(width * (SLIDE_HEIGHT / SLIDE_WIDTH));

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
          title={`Preview ${template}`}
          style={{
            width: SLIDE_WIDTH,
            height: SLIDE_HEIGHT,
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
