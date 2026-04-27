import { Badge } from "@/components/ui/badge";
import type { VideoPlatform, VideoPost } from "@/lib/api/videos";
import type { Json } from "@/lib/database.types";

/**
 * Best-effort accessors on the `raw` JSONB Apify payload.
 * The shape varies per platform; we pull a small whitelist of fields that
 * are stable enough to surface in the UI.
 */
interface RawExtras {
  // IG
  productType?: string;
  isPinned?: boolean;
  isCommentsDisabled?: boolean;
  firstComment?: string;
  latestComments?: Array<{ ownerUsername?: string; text?: string; owner?: { username?: string } }>;
  // YT
  isMonetized?: boolean;
  commentsTurnedOff?: boolean;
  channelUrl?: string;
  // TT
  isAd?: boolean;
  isSponsored?: boolean;
  isSlideshow?: boolean;
  locationCreated?: string;
}

function readRaw(raw: Json | null | undefined): RawExtras {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as unknown as RawExtras;
}

interface Comment {
  username: string;
  text: string;
}

function topComments(raw: RawExtras): Comment[] {
  const out: Comment[] = [];
  if (raw.firstComment && typeof raw.firstComment === "string" && raw.firstComment.length > 0) {
    out.push({ username: "—", text: raw.firstComment });
  }
  if (Array.isArray(raw.latestComments)) {
    for (const c of raw.latestComments.slice(0, 3)) {
      const username = c.ownerUsername ?? c.owner?.username ?? "—";
      const text = typeof c.text === "string" ? c.text : "";
      if (text) out.push({ username, text });
    }
  }
  return out.slice(0, 3);
}

interface Props {
  post: VideoPost;
}

export default function PostExtras({ post }: Props) {
  const platform = post.platform as VideoPlatform;
  const raw = readRaw(post.raw);
  const colorVar = `var(--platform-${platform})`;
  const dimVar = `var(--platform-${platform}-dim)`;
  const midVar = `var(--platform-${platform}-mid)`;

  const badges: Array<{ label: string; tone?: "neutral" | "warm" | "platform" }> = [];
  if (raw.productType === "clips") badges.push({ label: "Reel", tone: "platform" });
  else if (raw.productType === "feed") badges.push({ label: "Post", tone: "neutral" });
  if (raw.isPinned) badges.push({ label: "Fijado", tone: "warm" });
  if (raw.isSponsored || raw.isAd) badges.push({ label: "Patrocinado", tone: "warm" });
  if (raw.isMonetized) badges.push({ label: "Monetizado", tone: "platform" });
  if (raw.isCommentsDisabled || raw.commentsTurnedOff) badges.push({ label: "Comentarios off", tone: "neutral" });
  if (raw.isSlideshow) badges.push({ label: "Slideshow", tone: "neutral" });

  const comments = topComments(raw);
  const hasMusic = !!(post.music_name || post.music_author);
  const hasHashtags = (post.hashtags?.length ?? 0) > 0;
  const hasMentions = (post.mentions?.length ?? 0) > 0;
  const owner = post.owner_username;
  const ownerName = post.owner_full_name;
  const showAuthor = !!(owner || ownerName);

  if (
    badges.length === 0 &&
    comments.length === 0 &&
    !hasMusic &&
    !hasHashtags &&
    !hasMentions &&
    !showAuthor &&
    !raw.locationCreated
  ) {
    return null;
  }

  return (
    <div className="mt-4 space-y-3 border-t border-[var(--ll-border)] pt-3">
      {(showAuthor || raw.locationCreated) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: "var(--ll-text-muted)" }}>
          {showAuthor && (
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              @{owner ?? ownerName}
              {ownerName && owner && ownerName !== owner ? ` · ${ownerName}` : ""}
            </span>
          )}
          {raw.locationCreated && (
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>📍 {raw.locationCreated}</span>
          )}
        </div>
      )}

      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {badges.map((b) => {
            const styles: React.CSSProperties =
              b.tone === "platform"
                ? { background: dimVar, color: colorVar, borderColor: midVar }
                : b.tone === "warm"
                  ? { background: "var(--ll-warm-dim)", color: "var(--ll-warm)", borderColor: "var(--ll-warm)" + "40" }
                  : { borderColor: "var(--ll-border)", color: "var(--ll-text-muted)" };
            return (
              <Badge key={b.label} variant="outline" className="border" style={styles}>
                {b.label}
              </Badge>
            );
          })}
        </div>
      )}

      {hasMusic && (
        <div
          className="text-xs"
          style={{ color: "var(--ll-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}
        >
          🎵 {post.music_name ?? "Sound"}
          {post.music_author && <span style={{ color: "var(--ll-text-dim)" }}> · {post.music_author}</span>}
        </div>
      )}

      {(hasHashtags || hasMentions) && (
        <div className="flex flex-wrap gap-1.5">
          {(post.hashtags ?? []).map((h) => (
            <span
              key={`h-${h}`}
              className="rounded-md px-2 py-0.5 text-xs"
              style={{
                background: dimVar,
                color: colorVar,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              #{h.replace(/^#/, "")}
            </span>
          ))}
          {(post.mentions ?? []).map((m) => (
            <span
              key={`m-${m}`}
              className="rounded-md border px-2 py-0.5 text-xs"
              style={{
                borderColor: midVar,
                color: "var(--ll-text)",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              @{m.replace(/^@/, "")}
            </span>
          ))}
        </div>
      )}

      {comments.length > 0 && (
        <div className="space-y-2">
          <div
            className="text-[10px] uppercase tracking-[0.2em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-muted)" }}
          >
            Comentarios destacados
          </div>
          <ul className="space-y-1.5">
            {comments.map((c, i) => (
              <li key={i} className="text-xs" style={{ color: "var(--ll-text)" }}>
                <span
                  style={{
                    color: colorVar,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 600,
                  }}
                >
                  @{c.username}
                </span>{" "}
                <span style={{ color: "var(--ll-text-muted)" }}>{c.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
