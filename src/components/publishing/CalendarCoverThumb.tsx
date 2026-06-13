import { Film } from "lucide-react";
import { useCoverImageUrl } from "@/hooks/useCovers";
import { cn } from "@/lib/utils";
import type { ScheduledPostCover } from "@/lib/api/scheduledPosts";

/** Mini 9:16 cover preview for a scheduled post. Signs the cover-renders path
 * on-demand; falls back to a film icon when there's no (done) cover. */
export function CalendarCoverThumb({
  cover,
  className,
}: {
  cover?: ScheduledPostCover | null;
  className?: string;
}) {
  const path = cover?.status === "done" ? cover.generated_image_path : null;
  const { data: url } = useCoverImageUrl(path);

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded bg-[var(--ll-surface-2)]",
        className,
      )}
    >
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <Film className="h-3 w-3" style={{ color: "var(--ll-text-dim)" }} />
      )}
    </span>
  );
}
