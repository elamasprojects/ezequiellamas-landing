import { cn } from "@/lib/utils";
import type { ScheduledPostStatus } from "@/lib/api/scheduledPosts";
import { POST_STATUS_LABEL } from "@/lib/api/scheduledPosts";

const COLORS: Record<ScheduledPostStatus, string> = {
  draft: "border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text-muted)]",
  scheduled: "border-[var(--ll-blue)]/40 bg-[var(--ll-blue)]/10 text-[var(--ll-blue)]",
  publishing: "border-[var(--ll-warm)]/40 bg-[var(--ll-warm)]/15 text-[var(--ll-warm)] animate-pulse",
  published: "border-[var(--ll-accent)]/40 bg-[var(--ll-accent)]/10 text-[var(--ll-accent)]",
  partial: "border-[var(--ll-warm)]/40 bg-[var(--ll-warm)]/15 text-[var(--ll-warm)]",
  failed: "border-red-500/40 bg-red-500/10 text-red-400",
  cancelled: "border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text-dim)]",
};

export function PublishStatusPill({
  status,
  className,
}: {
  status: ScheduledPostStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        COLORS[status],
        className,
      )}
    >
      {POST_STATUS_LABEL[status]}
    </span>
  );
}
