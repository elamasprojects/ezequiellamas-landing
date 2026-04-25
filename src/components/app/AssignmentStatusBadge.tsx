import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, type AssignmentStatus } from "@/lib/api/assignments";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<AssignmentStatus, string> = {
  open: "border-[var(--ll-border)] text-[var(--ll-text-muted)]",
  in_progress: "border-[var(--ll-blue)]/40 bg-[var(--ll-blue)]/15 text-[var(--ll-blue)]",
  submitted: "border-[var(--ll-warm)]/40 bg-[var(--ll-warm)]/15 text-[var(--ll-warm)]",
  in_review: "border-[var(--ll-warm)]/40 bg-[var(--ll-warm)]/15 text-[var(--ll-warm)]",
  needs_correction: "border-red-500/40 bg-red-500/15 text-red-400",
  approved: "border-[var(--ll-accent)]/40 bg-[var(--ll-accent)]/15 text-[var(--ll-accent)]",
  archived: "border-[var(--ll-border)] text-[var(--ll-text-dim)]",
};

export default function AssignmentStatusBadge({ status }: { status: string }) {
  const s = (status as AssignmentStatus) in STATUS_LABEL ? (status as AssignmentStatus) : "open";
  return (
    <Badge variant="outline" className={cn("border", STATUS_CLASS[s])}>
      {STATUS_LABEL[s]}
    </Badge>
  );
}
