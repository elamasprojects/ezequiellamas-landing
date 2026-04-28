import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { buildSlideHtml } from "@/lib/carousel/render";
import type { TypedSlide } from "@/lib/api/carousels";
import type { CarouselMode } from "@/lib/carousel/types";
import { useHotkeys } from "@/hooks/useHotkeys";
import { cn } from "@/lib/utils";

const HANDLE = "@ezequiellamas";
const SWIPE_THRESHOLD_PX = 50;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slides: TypedSlide[];
  mode: CarouselMode;
}

/**
 * Instagram-like preview of a full carousel deck. Single slide visible at a
 * time with arrows + keyboard ←/→ + touch swipe. Resets to slide 1 each time
 * the dialog opens. Reads `localSlides` from the editor so unsaved edits show.
 */
export default function CarouselPreviewDialog({
  open,
  onOpenChange,
  slides,
  mode,
}: Props) {
  const [index, setIndex] = useState(0);
  const total = slides.length;
  const touchStartX = useRef<number | null>(null);

  // Reset to slide 1 every time the dialog opens
  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  // Keyboard ←/→ — only active while dialog is open
  const hotkeyMap = useMemo(
    () => ({
      arrowleft: () => setIndex((i) => Math.max(0, i - 1)),
      arrowright: () => setIndex((i) => Math.min(total - 1, i + 1)),
    }),
    [total],
  );
  useHotkeys(hotkeyMap, open);

  if (total === 0) return null;
  const safeIndex = Math.max(0, Math.min(index, total - 1));
  const slide = slides[safeIndex];

  const html = buildSlideHtml(
    {
      index: slide.index,
      template: slide.template,
      content: slide.content,
    },
    {
      totalSlides: total,
      mode,
      index: slide.index,
      outputMode: "static",
    },
  );

  const goPrev = () => setIndex((i) => Math.max(0, i - 1));
  const goNext = () => setIndex((i) => Math.min(total - 1, i + 1));

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const endX = e.changedTouches[0]?.clientX ?? null;
    if (endX != null) {
      const dx = endX - touchStartX.current;
      if (Math.abs(dx) > SWIPE_THRESHOLD_PX) {
        if (dx < 0) goNext();
        else goPrev();
      }
    }
    touchStartX.current = null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] gap-0 overflow-hidden border-[var(--ll-border)] bg-[var(--ll-surface)] p-0">
        <DialogTitle className="sr-only">Preview del carrusel</DialogTitle>

        {/* IG-like header. pr-12 leaves room for the dialog's X close button. */}
        <div className="flex items-center justify-between border-b border-[var(--ll-border)] py-3 pl-4 pr-12">
          <span
            className="text-sm font-semibold text-[var(--ll-text)]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {HANDLE}
          </span>
          <span
            className="text-xs text-[var(--ll-text-muted)]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {safeIndex + 1} / {total}
          </span>
        </div>

        {/* Slide area — 4:5 native, scales to dialog width */}
        <div
          className="relative overflow-hidden bg-black"
          style={{ aspectRatio: "1080 / 1350" }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <iframe
            key={slide.id}
            srcDoc={html}
            title={`Slide ${safeIndex + 1}`}
            className="absolute inset-0 h-full w-full border-0"
            sandbox="allow-same-origin"
          />

          {safeIndex > 0 && (
            <button
              type="button"
              onClick={goPrev}
              aria-label="Slide anterior"
              className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {safeIndex < total - 1 && (
            <button
              type="button"
              onClick={goNext}
              aria-label="Slide siguiente"
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-1.5 py-3">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Ir al slide ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === safeIndex
                  ? "w-6 bg-[var(--ll-accent)]"
                  : "w-1.5 bg-[var(--ll-text-dim)] hover:bg-[var(--ll-text-muted)]",
              )}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
