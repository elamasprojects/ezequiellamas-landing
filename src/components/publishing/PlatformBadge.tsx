import { Instagram, Youtube, Music2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublishPlatform } from "@/lib/publishing/platformLimits";
import { PLATFORM_LABEL } from "@/lib/publishing/platformLimits";

const ICONS: Record<PublishPlatform, typeof Instagram> = {
  instagram: Instagram,
  youtube: Youtube,
  tiktok: Music2,
};

const COLORS: Record<PublishPlatform, string> = {
  instagram: "border-[#E1306C]/40 bg-[#E1306C]/10 text-[#E1306C]",
  youtube: "border-[#FF0000]/40 bg-[#FF0000]/10 text-[#FF6B6B]",
  tiktok: "border-[var(--ll-text)]/40 bg-[var(--ll-surface-2)] text-[var(--ll-text)]",
};

export function PlatformBadge({
  platform,
  size = "sm",
  className,
  iconOnly = false,
}: {
  platform: PublishPlatform;
  size?: "xs" | "sm" | "md";
  className?: string;
  iconOnly?: boolean;
}) {
  const Icon = ICONS[platform];
  const sizing =
    size === "xs"
      ? "px-1.5 py-0.5 text-[10px] gap-1"
      : size === "md"
        ? "px-3 py-1 text-sm gap-2"
        : "px-2 py-0.5 text-xs gap-1.5";
  const iconSize = size === "xs" ? "h-3 w-3" : size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        COLORS[platform],
        sizing,
        className,
      )}
    >
      <Icon className={iconSize} />
      {!iconOnly && <span>{PLATFORM_LABEL[platform]}</span>}
    </span>
  );
}
