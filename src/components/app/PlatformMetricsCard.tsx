import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import PlatformIcon from "@/components/app/PlatformIcon";
import { PLATFORM_LABEL, isSyncable, type VideoPlatform, type VideoPost } from "@/lib/api/videos";
import { cn } from "@/lib/utils";

interface Props {
  post: VideoPost;
  /** When true, show a compact subset of metrics (used in the "All" view). */
  compact?: boolean;
  pending?: boolean;
  onSync?: () => void;
}

export default function PlatformMetricsCard({ post, compact = false, pending = false, onSync }: Props) {
  const platform = post.platform as VideoPlatform;
  const colorVar = `var(--platform-${platform})`;
  const dimVar = `var(--platform-${platform}-dim)`;
  const midVar = `var(--platform-${platform}-mid)`;
  const time = post.last_scraped_at
    ? formatDistanceToNow(new Date(post.last_scraped_at), { addSuffix: true, locale: es })
    : null;

  const allMetrics: Array<{ label: string; value: number | string | null }> = [
    { label: "Views", value: post.views_total },
    { label: "Likes", value: post.likes },
    { label: "Comments", value: post.comments },
    { label: "Shares", value: post.shares },
    { label: "Saves", value: post.saves },
    { label: "Reach", value: post.reach },
    { label: "Watch time (s)", value: post.watch_time_seconds },
    { label: "Retención (%)", value: post.retention_pct },
    { label: "Views orgánicos", value: post.views_organic },
    { label: "Views pagos", value: post.views_paid },
    { label: "Spend (USD)", value: post.spend },
    { label: "Duración (s)", value: post.video_duration },
  ];

  const visibleMetrics = compact
    ? allMetrics.slice(0, 6) // views/likes/comments/shares/saves/reach
    : allMetrics;

  return (
    <div
      className="overflow-hidden rounded-lg border bg-[var(--ll-surface)]"
      style={{ borderColor: midVar }}
    >
      <header
        className="flex items-center justify-between gap-2 px-4 py-3"
        style={{ background: dimVar, borderBottom: `1px solid ${midVar}` }}
      >
        <div className="flex items-center gap-2.5">
          <PlatformIcon platform={platform} className="h-5 w-5" />
          <div>
            <div
              className="text-xs uppercase tracking-[0.2em]"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: colorVar,
                fontWeight: 600,
              }}
            >
              {PLATFORM_LABEL[platform]}
            </div>
            {time && (
              <div
                className="text-[10px]"
                style={{ color: "var(--ll-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}
                title={post.last_scrape_error ?? undefined}
              >
                {post.last_scrape_error && <span className="text-red-400">● </span>}
                {time}
              </div>
            )}
          </div>
        </div>
        {onSync && isSyncable(platform) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={pending}
            onClick={onSync}
            aria-label={`Sincronizar ${PLATFORM_LABEL[platform]}`}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", pending && "animate-spin")} style={{ color: colorVar }} />
          </Button>
        )}
      </header>
      <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleMetrics.map((m) => (
          <div key={m.label}>
            <div
              className="text-[10px] uppercase tracking-[0.15em]"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-muted)" }}
            >
              {m.label}
            </div>
            <div
              className="mt-1 text-xl"
              style={{ fontFamily: "'Instrument Serif', serif", color: "var(--ll-text)", lineHeight: 1 }}
            >
              {m.value === null || m.value === undefined ? (
                <span style={{ color: "var(--ll-text-dim)" }}>—</span>
              ) : (
                formatValue(m.value)
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatValue(value: number | string): string {
  if (typeof value === "string") return value;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}
