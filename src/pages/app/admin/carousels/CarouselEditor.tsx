import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Check,
  Download,
  Film,
  Image as ImageIcon,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useCarousel } from "@/hooks/useCarousels";
import { useCarouselRealtime } from "@/hooks/useCarouselRealtime";
import { useHotkeys } from "@/hooks/useHotkeys";
import {
  asTyped,
  getSignedRenderUrl,
  regenerateSlide,
  startCarouselRender,
  updateSlideContent,
  type Carousel,
  type CarouselSlide,
  type CarouselStatus,
  type TypedSlide,
} from "@/lib/api/carousels";
import { buildSlideHtml } from "@/lib/carousel/render";
import { isFormatSlug, DEFAULT_FORMAT, type FormatSlug } from "@/lib/carousel/formats";
import type { CarouselMode, CarouselTemplate, Slide } from "@/lib/carousel/types";
import SlideEditor from "@/components/carousel/editors/SlideEditor";
import CarouselPreviewDialog from "@/components/carousel/CarouselPreviewDialog";
import { cn } from "@/lib/utils";

const SLIDE_W = 1080;
const SLIDE_H = 1350;
const SAVE_DEBOUNCE_MS = 600;
const PREVIEW_DEBOUNCE_MS = 200;

export default function CarouselEditor() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: carousel, isLoading, error } = useCarousel(id);
  useCarouselRealtime(id);

  // Local mirror of slides keyed by id, lets us mutate without round-tripping the query
  const [localSlides, setLocalSlides] = useState<TypedSlide[] | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const [saveState, setSaveState] = useState<Record<string, "idle" | "saving" | "saved">>({});
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenInstruction, setRegenInstruction] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const exportMutation = useMutation({
    mutationFn: (carouselId: string) => startCarouselRender(carouselId),
    onSuccess: (data) => {
      toast.success(`Renderizando ${data.total_slides} slides…`);
      qc.invalidateQueries({ queryKey: ["carousel", id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Hotkeys
  useHotkeys({
    j: () => {
      if (!localSlides) return;
      setFocusIndex((i) => Math.min(localSlides.length - 1, i + 1));
    },
    k: () => setFocusIndex((i) => Math.max(0, i - 1)),
    "1": () => setFocusIndex(0),
    "2": () => setFocusIndex(1),
    "3": () => setFocusIndex(2),
    "4": () => setFocusIndex(3),
    "5": () => setFocusIndex(4),
    "6": () => setFocusIndex(5),
    "7": () => setFocusIndex(6),
    "8": () => setFocusIndex(7),
    "cmd+s": (e) => {
      e.preventDefault();
      // Flush all pending saves
      Object.entries(saveTimers.current).forEach(([slideId, timer]) => {
        clearTimeout(timer);
        const slide = localSlides?.find((s) => s.id === slideId);
        if (slide) {
          slideUpdateMutation.mutate({ slideId, content: slide.content });
        }
      });
    },
    "cmd+enter": (e) => {
      e.preventDefault();
      if (carousel && carousel.status !== "rendering" && carousel.status !== "generating") {
        exportMutation.mutate(carousel.id);
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  // Initialize/refresh local state from query data. Deliberately depends on
  // granular fields so editing locally doesn't trigger a re-init on every
  // refetch -- only on actual id/updated_at/length changes.
  useEffect(() => {
    if (!carousel) return;
    setLocalSlides(carousel.slides.map(asTyped));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carousel?.id, carousel?.updated_at, carousel?.slides.length]);

  const slideUpdateMutation = useMutation({
    mutationFn: ({ slideId, content }: { slideId: string; content: unknown }) =>
      updateSlideContent(slideId, content),
    onSuccess: (_data, vars) => {
      setSaveState((s) => ({ ...s, [vars.slideId]: "saved" }));
      // Fade saved indicator after 1.5s
      setTimeout(() => {
        setSaveState((s) => {
          const next = { ...s };
          if (next[vars.slideId] === "saved") next[vars.slideId] = "idle";
          return next;
        });
      }, 1500);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const regenMutation = useMutation({
    mutationFn: (input: { carousel_id: string; slide_index: number; instruction?: string }) =>
      regenerateSlide(input),
    onSuccess: (data) => {
      if (!localSlides) return;
      const slide = localSlides[focusIndex];
      if (!slide) return;
      // Persist the new content via the slide id
      const newContent = data.content as never;
      slideUpdateMutation.mutate({ slideId: slide.id, content: newContent });
      setLocalSlides((prev) =>
        prev
          ? prev.map((s, i) =>
              i === focusIndex
                ? ({ ...s, content: newContent } as TypedSlide)
                : s,
            )
          : prev,
      );
      qc.invalidateQueries({ queryKey: ["carousel", carousel?.id] });
      toast.success("Slide regenerada");
      setRegenOpen(false);
      setRegenInstruction("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading || !localSlides) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40 bg-[var(--ll-surface)]" />
        <Skeleton className="h-[600px] w-full bg-[var(--ll-surface)]" />
      </div>
    );
  }

  if (error || !carousel) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-6 text-sm">
        <div className="flex items-center gap-2" style={{ color: "var(--ll-text)" }}>
          <AlertTriangle className="h-4 w-4 text-red-400" />
          No se encontró el carrusel.
        </div>
        <Button asChild variant="ghost" size="sm" className="mt-4">
          <Link to="/app/admin/carousels">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
        </Button>
      </div>
    );
  }

  const status = carousel.status as CarouselStatus;
  const mode = (carousel.mode as CarouselMode) ?? "static";
  const designFormat: FormatSlug = isFormatSlug(carousel.design_format)
    ? carousel.design_format
    : DEFAULT_FORMAT;
  const isGenerating = status === "generating";
  const focused = localSlides[focusIndex];

  function onSlideContentChange(slideId: string, newContent: unknown) {
    setLocalSlides((prev) =>
      prev
        ? prev.map((s) =>
            s.id === slideId ? ({ ...s, content: newContent } as TypedSlide) : s,
          )
        : prev,
    );
    setSaveState((s) => ({ ...s, [slideId]: "saving" }));
    // Debounce per-slide save
    if (saveTimers.current[slideId]) clearTimeout(saveTimers.current[slideId]);
    saveTimers.current[slideId] = setTimeout(() => {
      slideUpdateMutation.mutate({ slideId, content: newContent });
    }, SAVE_DEBOUNCE_MS);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-ml-2 text-[var(--ll-text-muted)]"
          >
            <Link to="/app/admin/carousels">
              <ArrowLeft className="h-4 w-4" /> Carruseles
            </Link>
          </Button>
          <h1
            className="text-xl md:text-2xl"
            style={{
              fontFamily: "'Instrument Serif', serif",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            {carousel.title ?? "Carrusel sin título"}
          </h1>
          <p
            className="line-clamp-1 max-w-xl text-sm"
            style={{ color: "var(--ll-text-muted)" }}
          >
            {carousel.concept}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-[var(--ll-border)] text-[var(--ll-text-muted)]">
            {mode === "animated" ? "animado" : "estático"}
          </Badge>
          <Badge variant="outline" className="border-[var(--ll-border)] text-[var(--ll-text)]">
            {localSlides.length} slides
          </Badge>
          <StatusBadge status={status} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-[var(--ll-text-muted)]"
            onClick={() => setPreviewOpen(true)}
            disabled={localSlides.length === 0 || status === "generating"}
            title="Preview tipo Instagram (← → para navegar)"
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </Button>
          <Button
            type="button"
            variant="brand"
            size="sm"
            onClick={() => carousel && exportMutation.mutate(carousel.id)}
            disabled={
              exportMutation.isPending ||
              status === "generating" ||
              status === "rendering"
            }
          >
            <Download className="h-3.5 w-3.5" />
            {status === "rendering"
              ? "Renderizando…"
              : status === "rendered"
                ? "Re-exportar"
                : "Exportar"}
          </Button>
        </div>
      </div>

      <CarouselPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        slides={localSlides}
        mode={mode}
        designFormat={designFormat}
      />

      {/* Render progress strip */}
      {status === "rendering" && (
        <RenderProgressStrip
          slides={carousel.slides}
          mode={mode}
        />
      )}

      {/* Generating state */}
      {isGenerating && (
        <div className="rounded-lg border border-[var(--ll-accent)]/30 bg-[var(--ll-accent)]/5 p-4 text-sm">
          <div className="flex items-center gap-2" style={{ color: "var(--ll-text)" }}>
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--ll-accent)]" />
            Generando slides… esto tarda 15-30s. Refrescá la página en un toque.
          </div>
        </div>
      )}

      {/* Error state */}
      {status === "error" && carousel.generation_error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm">
          <div className="mb-1 flex items-center gap-2 font-medium" style={{ color: "var(--ll-text)" }}>
            <AlertTriangle className="h-4 w-4 text-red-400" />
            La generación falló
          </div>
          <code className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
            {carousel.generation_error}
          </code>
        </div>
      )}

      {/* Slide selector tabs */}
      {localSlides.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {localSlides.map((s, i) => {
            const sv = saveState[s.id];
            const dbSlide = carousel.slides.find((cs) => cs.id === s.id);
            const renderStatus = dbSlide?.render_status as
              | "pending"
              | "queued"
              | "rendering"
              | "done"
              | "error"
              | undefined;
            const renderedFormat = dbSlide?.rendered_format as
              | "png"
              | "mp4"
              | undefined;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setFocusIndex(i)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs",
                  i === focusIndex
                    ? "border-[var(--ll-accent)] bg-[var(--ll-accent)]/10 text-[var(--ll-accent)]"
                    : "border-[var(--ll-border)] text-[var(--ll-text-muted)] hover:bg-[var(--ll-surface)]",
                )}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <span>{String(i + 1).padStart(2, "0")}</span>
                <span style={{ color: "var(--ll-text-dim)" }}>·</span>
                <span>{s.template}</span>
                {sv === "saving" && (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                )}
                {sv === "saved" && (
                  <Check className="h-3 w-3 text-emerald-400" />
                )}
                {renderStatus === "rendering" && (
                  <RefreshCw className="h-3 w-3 animate-spin text-[var(--ll-warm)]" />
                )}
                {renderStatus === "queued" && (
                  <span className="h-2 w-2 rounded-full bg-[var(--ll-warm)]/60" />
                )}
                {renderStatus === "done" && renderedFormat === "mp4" && (
                  <Film className="h-3 w-3 text-emerald-400" />
                )}
                {renderStatus === "done" && renderedFormat === "png" && (
                  <ImageIcon className="h-3 w-3 text-emerald-400" />
                )}
                {renderStatus === "error" && (
                  <AlertTriangle className="h-3 w-3 text-red-400" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Split layout: preview + editor */}
      {focused && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          {/* Preview pane */}
          <div className="space-y-3 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4">
            <div className="flex items-center justify-between">
              <div
                className="text-[10px] uppercase tracking-[0.25em]"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "var(--ll-text-muted)",
                }}
              >
                Preview · {focused.template}
              </div>
              <div className="flex items-center gap-1">
                <DownloadButton
                  slide={carousel.slides.find((cs) => cs.id === focused.id)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-[var(--ll-text-muted)]"
                  onClick={() => {
                    setRegenInstruction("");
                    setRegenOpen(true);
                  }}
                  disabled={regenMutation.isPending}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Regenerar
                </Button>
              </div>
            </div>
            <SlidePreview
              slide={{
                index: focused.index,
                template: focused.template,
                content: focused.content,
              }}
              totalSlides={localSlides.length}
              mode={mode}
              designFormat={designFormat}
            />
          </div>

          {/* Editor pane */}
          <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4">
            <div
              className="mb-4 text-[10px] uppercase tracking-[0.25em]"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: "var(--ll-text-muted)",
              }}
            >
              Editor · slide {focusIndex + 1}/{localSlides.length}
            </div>
            <SlideEditor
              key={focused.id}
              template={focused.template as CarouselTemplate}
              content={focused.content}
              onChange={(next) => onSlideContentChange(focused.id, next)}
            />
          </div>
        </div>
      )}

      {/* Regenerate dialog */}
      <Dialog open={regenOpen} onOpenChange={setRegenOpen}>
        <DialogContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
          <DialogHeader>
            <DialogTitle
              style={{
                fontFamily: "'Instrument Serif', serif",
                letterSpacing: "-0.02em",
              }}
            >
              Regenerar slide {focusIndex + 1}
            </DialogTitle>
            <DialogDescription style={{ color: "var(--ll-text-muted)" }}>
              Claude reescribe el contenido manteniendo el template y la narrativa
              del carrusel. Podés darle una instrucción opcional.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={regenInstruction}
            onChange={(e) => setRegenInstruction(e.target.value)}
            placeholder="Hacelo más punzante. Sacá el em-dash. Cambiá el ángulo a money model. (opcional)"
            rows={4}
            className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRegenOpen(false)}
              disabled={regenMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="brand"
              disabled={regenMutation.isPending}
              onClick={() => {
                if (!carousel) return;
                regenMutation.mutate({
                  carousel_id: carousel.id,
                  slide_index: focusIndex,
                  instruction: regenInstruction.trim() || undefined,
                });
              }}
            >
              <Sparkles className="h-4 w-4" />
              {regenMutation.isPending ? "Regenerando…" : "Regenerar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: CarouselStatus }) {
  const labels: Record<CarouselStatus, string> = {
    draft: "Borrador",
    generating: "Generando",
    ready: "Listo",
    rendering: "Renderizando",
    rendered: "Exportado",
    error: "Error",
  };
  const classes: Record<CarouselStatus, string> = {
    draft: "border-[var(--ll-border)] text-[var(--ll-text-muted)]",
    generating:
      "border-[var(--ll-accent)]/40 bg-[var(--ll-accent)]/15 text-[var(--ll-accent)] animate-pulse",
    ready: "border-[var(--ll-border)] text-[var(--ll-text)]",
    rendering:
      "border-[var(--ll-warm)]/40 bg-[var(--ll-warm)]/15 text-[var(--ll-warm)] animate-pulse",
    rendered: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
    error: "border-red-500/40 bg-red-500/15 text-red-300",
  };
  return (
    <Badge variant="outline" className={`border ${classes[status]}`}>
      {labels[status]}
    </Badge>
  );
}

/**
 * Live preview iframe. Re-renders the HTML on every content change with a
 * 200ms debounce to avoid thrashing srcdoc.
 */
function SlidePreview({
  slide,
  totalSlides,
  mode,
  designFormat,
}: {
  slide: Slide;
  totalSlides: number;
  mode: CarouselMode;
  designFormat: FormatSlug;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [debouncedSlide, setDebouncedSlide] = useState(slide);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setWidth(rect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSlide(slide), PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [slide]);

  const html = useMemo(
    () =>
      buildSlideHtml(debouncedSlide, {
        totalSlides,
        mode,
        index: debouncedSlide.index,
        outputMode: "static",
        format: designFormat,
      }),
    [debouncedSlide, totalSlides, mode, designFormat],
  );

  const scale = width === 0 ? 0 : Math.min(1, width / SLIDE_W);
  const scaledH = SLIDE_H * scale;
  const scaledW = SLIDE_W * scale;

  return (
    <div ref={containerRef}>
      <div
        className="mx-auto overflow-hidden rounded-md border border-[var(--ll-border)] bg-black"
        style={{ width: scaledW, height: scaledH }}
      >
        <div
          style={{
            width: SLIDE_W,
            height: SLIDE_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <iframe
            srcDoc={html}
            title={`Slide ${slide.index + 1}`}
            width={SLIDE_W}
            height={SLIDE_H}
            style={{ border: 0, display: "block" }}
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Per-slide download button. Resolves a 15-min signed URL on click and
 * triggers a browser download.
 */
function DownloadButton({ slide }: { slide?: CarouselSlide }) {
  const [busy, setBusy] = useState(false);
  if (!slide?.rendered_path) return null;
  const isMp4 = slide.rendered_format === "mp4";

  async function onClick() {
    if (!slide?.rendered_path) return;
    try {
      setBusy(true);
      const url = await getSignedRenderUrl(slide.rendered_path);
      const filename = `slide_${String(slide.index + 1).padStart(2, "0")}.${slide.rendered_format ?? "png"}`;
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-[var(--ll-text-muted)]"
      onClick={onClick}
      disabled={busy}
      title={`Descargar ${isMp4 ? "MP4" : "PNG"}`}
    >
      {isMp4 ? <Film className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
      {busy ? "…" : "Descargar"}
    </Button>
  );
}

/**
 * Per-slide progress dots while rendering. Updates in realtime via the
 * useCarouselRealtime hook.
 */
function RenderProgressStrip({
  slides,
  mode: _mode,
}: {
  slides: CarouselSlide[];
  mode: CarouselMode;
}) {
  const sorted = [...slides].sort((a, b) => a.index - b.index);
  const done = sorted.filter((s) => s.render_status === "done").length;
  const errored = sorted.filter((s) => s.render_status === "error").length;
  const total = sorted.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="rounded-lg border border-[var(--ll-warm)]/30 bg-[var(--ll-warm)]/5 p-3 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2" style={{ color: "var(--ll-text)" }}>
          <RefreshCw className="h-4 w-4 animate-spin text-[var(--ll-warm)]" />
          Renderizando · {done}/{total} listas
          {errored > 0 && (
            <span className="text-red-400">· {errored} con error</span>
          )}
        </div>
        <span
          className="text-xs"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            color: "var(--ll-text-muted)",
          }}
        >
          {pct}%
        </span>
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }}>
        {sorted.map((s) => (
          <div
            key={s.id}
            className={cn(
              "h-1.5 rounded-full",
              s.render_status === "done" && "bg-emerald-400/80",
              s.render_status === "rendering" &&
                "animate-pulse bg-[var(--ll-warm)]/80",
              s.render_status === "queued" && "bg-[var(--ll-warm)]/20",
              s.render_status === "error" && "bg-red-500/60",
              (s.render_status === "pending" || !s.render_status) &&
                "bg-[var(--ll-border)]",
            )}
            title={`slide ${s.index + 1}: ${s.render_status}`}
          />
        ))}
      </div>
    </div>
  );
}
