import { Link } from "react-router-dom";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { CalendarCoverThumb } from "@/components/publishing/CalendarCoverThumb";
import { ScheduledPostPreview } from "@/components/publishing/ScheduledPostPreview";
import type { ScheduledPostStatus, ScheduledPostWithJobs } from "@/lib/api/scheduledPosts";

// At-a-glance status cue (left border) so a failed/published post is
// distinguishable from a scheduled one without opening the hover-card.
const STATUS_COLOR: Record<ScheduledPostStatus, string> = {
  draft: "var(--ll-text-dim)",
  scheduled: "var(--ll-accent)",
  publishing: "var(--ll-warm)",
  published: "#4ade80",
  partial: "var(--ll-warm)",
  failed: "#f87171",
  cancelled: "var(--ll-text-dim)",
};

/** Calendar pill for a scheduled/published post: mini cover + title, with a
 * 2s-hover card showing cover, time, platform icons, status and live countdown.
 * Click goes to the full detail. Shared by the content + publishing calendars. */
export function ScheduledPostPill({ post }: { post: ScheduledPostWithJobs }) {
  return (
    <HoverCard openDelay={2000} closeDelay={150}>
      <HoverCardTrigger asChild>
        <Link
          to={`/app/admin/publishing/${post.id}`}
          className="flex items-center gap-1.5 rounded border-l-2 bg-[var(--ll-surface-2)] p-1 pl-1.5 transition-shadow hover:ring-1 hover:ring-[var(--ll-border-strong)]"
          style={{ borderLeftColor: STATUS_COLOR[post.status] ?? "var(--ll-border)" }}
        >
          <CalendarCoverThumb cover={post.cover} className="aspect-[9/16] w-3.5" />
          <span
            className="min-w-0 flex-1 truncate text-[10px]"
            style={{ color: "var(--ll-text)" }}
            title={post.title ?? "Sin título"}
          >
            {post.title || "(sin título)"}
          </span>
        </Link>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="border-[var(--ll-border)] bg-[var(--ll-surface)]">
        <ScheduledPostPreview post={post} />
      </HoverCardContent>
    </HoverCard>
  );
}
