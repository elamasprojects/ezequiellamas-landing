import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, ExternalLink } from "lucide-react";
import { CalendarCoverThumb } from "@/components/publishing/CalendarCoverThumb";
import { PlatformBadge } from "@/components/publishing/PlatformBadge";
import { PublishStatusPill } from "@/components/publishing/PublishStatusPill";
import { POST_STATUS_LABEL, type ScheduledPostWithJobs } from "@/lib/api/scheduledPosts";
import type { PublishPlatform } from "@/lib/publishing/platformLimits";

const TZ = "America/Argentina/Buenos_Aires";

/** "sáb 13 jun, 10:00" in the post's own timezone. */
function formatScheduledTime(iso: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat("es-AR", {
      timeZone: tz || TZ,
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString("es-AR");
  }
}

/** "en 2 d 6 h" / "en 6 h 32 min" / "en 45 min". Null once it's due/past. */
function formatCountdown(iso: string, nowMs: number): string | null {
  const diff = new Date(iso).getTime() - nowMs;
  if (diff <= 0) return null;
  const totalMin = Math.floor(diff / 60_000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins = totalMin % 60;
  if (days > 0) return `en ${days} d ${hours} h`;
  if (hours > 0) return `en ${hours} h ${mins} min`;
  return `en ${mins} min`;
}

export function ScheduledPostPreview({ post }: { post: ScheduledPostWithJobs }) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Tick once a minute while the card is open so the countdown stays live.
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const countdown = post.status === "scheduled" ? formatCountdown(post.scheduled_at, nowMs) : null;
  const platforms = post.publish_jobs.map((j) => j.platform as PublishPlatform);

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <CalendarCoverThumb cover={post.cover} className="aspect-[9/16] w-16 border border-[var(--ll-border)]" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="line-clamp-2 text-sm font-medium" style={{ color: "var(--ll-text)" }}>
            {post.title || "(sin título)"}
          </p>
          <div className="flex flex-wrap items-center gap-1">
            {platforms.map((p) => (
              <PlatformBadge key={p} platform={p} size="xs" iconOnly />
            ))}
          </div>
          <PublishStatusPill status={post.status} className="text-[9px] px-1.5 py-0" />
        </div>
      </div>

      <div className="space-y-1 border-t border-[var(--ll-border)] pt-2 text-xs" style={{ color: "var(--ll-text-muted)" }}>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {formatScheduledTime(post.scheduled_at, post.timezone)}
          </span>
        </div>
        <div className="pl-5" style={{ color: countdown ? "var(--ll-accent)" : "var(--ll-text-muted)" }}>
          {countdown ?? POST_STATUS_LABEL[post.status]}
        </div>
      </div>

      <Link
        to={`/app/admin/publishing/${post.id}`}
        className="inline-flex items-center gap-1 text-[11px]"
        style={{ color: "var(--ll-text-muted)" }}
      >
        <ExternalLink className="h-3 w-3" /> Ver detalle completo
      </Link>
    </div>
  );
}
