import { useEffect, useRef, useState } from "react";
import type { ReferentVideo } from "@/lib/api/referents";
import { useSavedReferentVideoIds } from "@/hooks/useReferentCollections";
import { ReferentFeedItem } from "./ReferentFeedItem";

interface Props {
  videos: ReferentVideo[];
  referentName?: string | null;
  readOnly?: boolean;
}

/**
 * Instagram/TikTok-style vertical feed of a referent's virals. Scroll-snap deck;
 * an IntersectionObserver tracks the active slide (drives the play affordance).
 * Videos are already loaded + ordered (views desc) upstream — no pagination.
 */
export function ReferentFeedContainer({ videos, referentName, readOnly }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: savedIds } = useSavedReferentVideoIds();
  const savedSet = new Set(savedIds ?? []);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio >= 0.6) {
            const idx = Number((e.target as HTMLElement).dataset.index);
            if (!Number.isNaN(idx)) setActiveIndex(idx);
          }
        });
      },
      { root, threshold: [0.6] },
    );
    root.querySelectorAll("[data-slide]").forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, [videos.length]);

  if (videos.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--ll-border)] bg-[var(--ll-surface)] p-12 text-center text-sm" style={{ color: "var(--ll-text-muted)" }}>
        No hay videos en este filtro.
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="mx-auto h-[80vh] max-h-[860px] w-full max-w-[440px] snap-y snap-mandatory overflow-y-scroll rounded-2xl border border-[var(--ll-border)] bg-black [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
      {videos.map((video, i) => (
        <div key={video.id} data-slide data-index={i} className="h-full w-full snap-start snap-always">
          <ReferentFeedItem
            video={video}
            active={i === activeIndex}
            referentName={referentName}
            saved={savedSet.has(video.id)}
            readOnly={readOnly}
          />
        </div>
      ))}
    </div>
  );
}
