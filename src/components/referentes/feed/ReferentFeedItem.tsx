import { useState } from "react";
import { Play, Eye, Heart } from "lucide-react";
import type { ReferentVideo } from "@/lib/api/referents";
import ReferentVideoEmbedDialog from "@/components/referentes/ReferentVideoEmbedDialog";
import AdaptToMyVoiceDialog from "@/pages/app/admin/referentes/AdaptToMyVoiceDialog";
import SaveToReferentCollectionDialog from "./SaveToReferentCollectionDialog";
import { ReferentActionsRail } from "./ReferentActionsRail";

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

interface Props {
  video: ReferentVideo;
  active: boolean;
  referentName?: string | null;
  saved: boolean;
  readOnly?: boolean;
}

export function ReferentFeedItem({ video, active, referentName, saved, readOnly }: Props) {
  const [embedOpen, setEmbedOpen] = useState(false);
  const [adaptOpen, setAdaptOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {/* Thumbnail (tap to open the native embed) */}
      <button
        type="button"
        onClick={() => setEmbedOpen(true)}
        className="absolute inset-0 h-full w-full"
        aria-label="Reproducir video"
      >
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt=""
            className="h-full w-full object-cover opacity-90"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="h-full w-full bg-[var(--ll-surface-2)]" />
        )}
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30" />
        {active && (
          <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 backdrop-blur">
            <Play className="h-7 w-7 text-white" fill="white" />
          </span>
        )}
      </button>

      {/* Bottom-left: referent + caption + metrics */}
      <div className="pointer-events-none absolute bottom-6 left-4 right-20 z-20 space-y-1.5 text-white">
        {referentName && (
          <div
            className="text-[11px] uppercase tracking-[0.2em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
          >
            {referentName}
          </div>
        )}
        <p className="line-clamp-2 text-sm font-medium drop-shadow">
          {video.title ?? video.caption ?? ""}
        </p>
        <div className="flex items-center gap-4 text-xs text-white/90 drop-shadow">
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" /> {fmt(video.views_total)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" /> {fmt(video.likes)}
          </span>
          <span className="uppercase opacity-80">{video.platform}</span>
        </div>
      </div>

      {/* Right rail */}
      {!readOnly && (
        <ReferentActionsRail
          saved={saved}
          onSave={() => setSaveOpen(true)}
          onReuse={() => setAdaptOpen(true)}
          sourceUrl={video.source_url}
        />
      )}

      {/* Dialogs (mounted per item; cheap, only the active slide is on screen) */}
      <ReferentVideoEmbedDialog open={embedOpen} onOpenChange={setEmbedOpen} video={video} />
      {!readOnly && adaptOpen && (
        <AdaptToMyVoiceDialog
          open={adaptOpen}
          onOpenChange={setAdaptOpen}
          video={video}
          referentName={referentName}
        />
      )}
      {!readOnly && (
        <SaveToReferentCollectionDialog open={saveOpen} onOpenChange={setSaveOpen} referentVideoId={video.id} />
      )}
    </div>
  );
}
