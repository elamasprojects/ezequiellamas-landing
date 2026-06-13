import { ExternalLink } from "lucide-react";
import PlatformIcon from "@/components/app/PlatformIcon";
import { PLATFORM_LABEL, isSyncable, type VideoPlatform, type VideoPost } from "@/lib/api/videos";

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
  post: VideoPost;
  /** Render only the iframe, filling the parent (no header / max-width). For card playback. */
  bare?: boolean;
}

/**
 * Embed the video using each platform's native iframe. Falls back to a
 * "open in platform" card if there's no apify_short_code yet (e.g. fresh
 * "other" platform or first sync hasn't run).
 */
export default function VideoEmbed({ post, bare = false }: Props) {
  const platform = post.platform as VideoPlatform;
  const shortCode = post.apify_short_code;
  const colorVar = `var(--platform-${platform})`;

  if ((!isSyncable(platform) || !shortCode) && bare) {
    return (
      <a
        href={post.source_url}
        target="_blank"
        rel="noreferrer"
        className="flex h-full w-full items-center justify-center bg-[var(--ll-surface-2)]"
      >
        <PlatformIcon platform={platform} className="h-8 w-8" />
      </a>
    );
  }

  if (!isSyncable(platform) || !shortCode) {
    return (
      <a
        href={post.source_url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-between gap-3 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4 transition-colors hover:bg-[var(--ll-surface-2)]"
      >
        <div className="flex items-center gap-3">
          <PlatformIcon platform={platform} className="h-5 w-5" />
          <div>
            <div
              className="text-xs uppercase tracking-[0.2em]"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: colorVar }}
            >
              {PLATFORM_LABEL[platform]}
            </div>
            <div className="break-all text-xs" style={{ color: "var(--ll-text-muted)" }}>
              {post.source_url}
            </div>
          </div>
        </div>
        <ExternalLink className="h-4 w-4" style={{ color: "var(--ll-text-muted)" }} />
      </a>
    );
  }

  const embedSrc = EMBED_URL[platform](shortCode);
  const aspect = ASPECT[platform];

  if (bare) {
    return (
      <iframe
        src={embedSrc}
        className="h-full w-full"
        allow="autoplay; encrypted-media; picture-in-picture; clipboard-write"
        allowFullScreen
        loading="lazy"
        title={`${PLATFORM_LABEL[platform]} embed`}
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <PlatformIcon platform={platform} className="h-4 w-4" />
        <span
          className="text-xs uppercase tracking-[0.2em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: colorVar }}
        >
          {PLATFORM_LABEL[platform]}
        </span>
      </div>
      <div className={`mx-auto w-full max-w-md overflow-hidden rounded-lg border border-[var(--ll-border)] bg-black ${aspect}`}>
        <iframe
          src={embedSrc}
          className="h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture; clipboard-write"
          allowFullScreen
          loading="lazy"
          title={`${PLATFORM_LABEL[platform]} embed`}
        />
      </div>
    </div>
  );
}
