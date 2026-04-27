import { Link } from "react-router-dom";
import { Image as ImageIcon, Video as VideoIcon } from "lucide-react";
import type { ScheduledPostWithJobs } from "@/lib/api/scheduledPosts";
import type { PublishPlatform } from "@/lib/publishing/platformLimits";
import { PlatformBadge } from "./PlatformBadge";
import { PublishStatusPill } from "./PublishStatusPill";

export function ScheduledPostCard({ post }: { post: ScheduledPostWithJobs }) {
  const platforms = post.publish_jobs.map((j) => j.platform as PublishPlatform);
  const date = new Date(post.scheduled_at);
  const dateStr = date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

  return (
    <Link
      to={`/app/admin/publishing/${post.id}`}
      className="group flex gap-3 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-3 transition-colors hover:border-[var(--ll-accent)]/40"
    >
      {post.thumbnail_url ? (
        <img
          src={post.thumbnail_url}
          alt=""
          className="h-16 w-16 shrink-0 rounded object-cover"
        />
      ) : (
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded"
          style={{ background: "var(--ll-surface-2)", color: "var(--ll-text-dim)" }}
        >
          {post.asset_kind === "video" ? (
            <VideoIcon className="h-5 w-5" />
          ) : (
            <ImageIcon className="h-5 w-5" />
          )}
        </div>
      )}

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-medium" style={{ color: "var(--ll-text)" }}>
            {post.title || (
              <span style={{ color: "var(--ll-text-dim)" }} className="italic">
                Sin título
              </span>
            )}
          </h3>
          <PublishStatusPill status={post.status} />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {platforms.length === 0 ? (
            <span className="text-xs" style={{ color: "var(--ll-text-dim)" }}>
              Sin plataformas
            </span>
          ) : (
            platforms.map((p) => <PlatformBadge key={p} platform={p} size="xs" />)
          )}
        </div>

        <div
          className="flex items-center gap-2 text-xs"
          style={{ color: "var(--ll-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}
        >
          <span>{dateStr}</span>
          <span style={{ color: "var(--ll-text-dim)" }}>·</span>
          <span>{timeStr}</span>
          <span style={{ color: "var(--ll-text-dim)" }}>·</span>
          <span>{post.asset_kind === "video" ? "Video" : "Carrousel"}</span>
        </div>
      </div>
    </Link>
  );
}
