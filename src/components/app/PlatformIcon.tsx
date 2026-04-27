import { cn } from "@/lib/utils";
import type { VideoPlatform } from "@/lib/api/videos";

const PLATFORM_COLOR: Record<VideoPlatform, string> = {
  instagram: "var(--platform-instagram)",
  youtube: "var(--platform-youtube)",
  tiktok: "var(--platform-tiktok)",
  other: "var(--ll-text-dim)",
};

interface Props {
  platform: VideoPlatform;
  className?: string;
  /** When true, paint the icon in the platform brand color. */
  colored?: boolean;
}

/**
 * Brand icons for the 3 supported platforms (plus a fallback "other").
 * Hand-rolled SVG glyphs (single path each) so they stay crisp at any size
 * and inherit currentColor for easy theming.
 */
export default function PlatformIcon({ platform, className, colored = true }: Props) {
  const color = colored ? PLATFORM_COLOR[platform] : "currentColor";

  if (platform === "instagram") {
    return (
      <svg viewBox="0 0 24 24" className={cn("inline-block", className)} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-label="Instagram">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    );
  }
  if (platform === "youtube") {
    return (
      <svg viewBox="0 0 24 24" className={cn("inline-block", className)} fill={color} aria-label="YouTube">
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.8zM9.6 15.6V8.4l6.4 3.6-6.4 3.6z" />
      </svg>
    );
  }
  if (platform === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" className={cn("inline-block", className)} fill={color} aria-label="TikTok">
        <path d="M19.6 6.3a4.7 4.7 0 0 1-2.8-1.6 4.7 4.7 0 0 1-1-2.7h-3.4v13.1a2.7 2.7 0 1 1-2.7-2.7c.3 0 .5 0 .8.1V8.9a6.4 6.4 0 0 0-.8-.1 6.2 6.2 0 1 0 6.2 6.2V8.7a8.1 8.1 0 0 0 4.6 1.5V6.8a4.6 4.6 0 0 1-.9-.5z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={cn("inline-block", className)} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-label="Otra">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}
