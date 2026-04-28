import { ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ReferentVideo } from "@/lib/api/referents";

// Same embed-URL mapping as @/components/app/VideoEmbed.tsx — kept inline here
// so the referentes module is self-contained. If you ever change one, mirror it
// in the other.
const EMBED_URL: Record<"instagram" | "youtube" | "tiktok", (id: string) => string> = {
  instagram: (id) => `https://www.instagram.com/p/${id}/embed/captioned/`,
  youtube: (id) => `https://www.youtube.com/embed/${id}`,
  tiktok: (id) => `https://www.tiktok.com/embed/v2/${id}`,
};

const ASPECT: Record<"instagram" | "youtube" | "tiktok", string> = {
  instagram: "aspect-[9/16]",
  youtube: "aspect-video",
  tiktok: "aspect-[9/16]",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: ReferentVideo | null;
}

/**
 * Inline player for a referent's viral video. Uses the platform's native embed
 * (no auth required, no API token consumed). Tap thumbnail in the card → opens
 * this dialog. Esc / click outside closes.
 */
export default function ReferentVideoEmbedDialog({ open, onOpenChange, video }: Props) {
  if (!video) return null;
  const platform = video.platform as "instagram" | "youtube" | "tiktok";
  const shortCode = video.apify_short_code;

  // YT renders wider than IG/TT — bump the dialog max-width for landscape.
  const maxW = platform === "youtube" ? "max-w-2xl" : "max-w-[420px]";
  const aspect = ASPECT[platform];
  const canEmbed = !!shortCode && platform in EMBED_URL;
  const embedSrc = canEmbed ? EMBED_URL[platform](shortCode!) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "gap-0 overflow-hidden border-[var(--ll-border)] bg-[var(--ll-surface)] p-0",
          maxW,
        )}
      >
        <DialogTitle className="sr-only">
          {video.title ?? video.caption ?? "Video del referente"}
        </DialogTitle>

        {embedSrc ? (
          <div className={cn("w-full bg-black", aspect)}>
            <iframe
              src={embedSrc}
              className="h-full w-full border-0"
              allow="autoplay; encrypted-media; picture-in-picture; clipboard-write"
              allowFullScreen
              loading="lazy"
              title={`${platform} embed`}
            />
          </div>
        ) : (
          // Fallback: no shortCode (rare). Just expose the external URL.
          <div className="space-y-2 p-6">
            <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
              No tenemos el ID corto del post — abrí el video en {platform}:
            </p>
            <a
              href={video.source_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm"
              style={{ color: "var(--ll-accent)" }}
            >
              {video.source_url}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}

        {/* Footer: external link + caption preview */}
        <div className="flex items-start justify-between gap-3 border-t border-[var(--ll-border)] p-3">
          <p
            className="line-clamp-2 text-xs flex-1"
            style={{ color: "var(--ll-text-muted)" }}
          >
            {video.title ?? video.caption ?? ""}
          </p>
          <a
            href={video.source_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1 text-[11px]"
            style={{
              color: "var(--ll-text-muted)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Abrir
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
