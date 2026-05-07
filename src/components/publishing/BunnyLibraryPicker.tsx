import { useMemo, useState } from "react";
import { Search, Video as VideoIcon, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useBunnyVideos, type BunnyVideoRow } from "@/hooks/useBunnyVideos";
import { cn } from "@/lib/utils";

interface Props {
  onSelect: (video: BunnyVideoRow) => void;
}

export function BunnyLibraryPicker({ onSelect }: Props) {
  const { data, isLoading, isError, error } = useBunnyVideos();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return data;
    return data.filter(
      (v) =>
        (v.title ?? "").toLowerCase().includes(needle) ||
        (v.filename ?? "").toLowerCase().includes(needle),
    );
  }, [data, q]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
          style={{ color: "var(--ll-text-dim)" }}
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o archivo…"
          className="pl-9 bg-[var(--ll-surface)] border-[var(--ll-border)]"
        />
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-md bg-[var(--ll-surface)]" />
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-center">
          <AlertCircle className="mx-auto mb-2 h-5 w-5 text-red-400" />
          <p className="text-xs text-red-400">
            {error instanceof Error ? error.message : "No pudimos cargar la biblioteca"}
          </p>
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="rounded-lg border border-dashed border-[var(--ll-border)] bg-[var(--ll-surface)] p-8 text-center">
          <VideoIcon className="mx-auto mb-2 h-6 w-6" style={{ color: "var(--ll-text-dim)" }} />
          <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
            {q ? "Sin resultados" : "Todavía no subiste ningún video"}
          </p>
        </div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 max-h-[480px] overflow-y-auto pr-1"
          style={{ scrollbarWidth: "thin" }}
        >
          {filtered.map((v) => (
            <VideoCard key={v.id} video={v} onClick={() => onSelect(v)} />
          ))}
        </div>
      )}
    </div>
  );
}

function VideoCard({ video, onClick }: { video: BunnyVideoRow; onClick: () => void }) {
  const isReady = video.status === "ready";
  const isFailed = video.status === "failed";
  const isInTransit = video.status === "uploading" || video.status === "encoding";
  const label = video.title ?? video.filename ?? video.bunny_video_id.slice(0, 8);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-md border bg-[var(--ll-surface)] text-left transition-colors",
        "border-[var(--ll-border)] hover:border-[var(--ll-border-hover)]",
        isFailed && "opacity-70",
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-[var(--ll-bg)]">
        {video.thumbnail_url && isReady ? (
          <img
            src={video.thumbnail_url}
            alt={label}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            {isInTransit ? (
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--ll-accent)" }} />
            ) : isFailed ? (
              <AlertCircle className="h-6 w-6 text-red-400" />
            ) : (
              <VideoIcon className="h-6 w-6" style={{ color: "var(--ll-text-dim)" }} />
            )}
          </div>
        )}
        <div className="absolute bottom-1 left-1">
          <StatusBadge status={video.status} progress={video.encode_progress} />
        </div>
      </div>
      <div className="p-2">
        <p
          className="truncate text-xs font-medium"
          style={{ color: "var(--ll-text)" }}
          title={label}
        >
          {label}
        </p>
        <div
          className="mt-0.5 flex items-center gap-1.5 text-[10px]"
          style={{ color: "var(--ll-text-dim)", fontFamily: "'JetBrains Mono', monospace" }}
        >
          {video.duration_seconds != null && <span>{video.duration_seconds.toFixed(0)}s</span>}
          {video.duration_seconds != null && <span>·</span>}
          <span>{formatDistanceToNow(new Date(video.created_at), { locale: es, addSuffix: false })}</span>
        </div>
      </div>
    </button>
  );
}

function StatusBadge({
  status,
  progress,
}: {
  status: BunnyVideoRow["status"];
  progress: number | null;
}) {
  if (status === "ready") {
    return (
      <Badge
        variant="outline"
        className="h-5 gap-1 border-emerald-500/40 bg-emerald-500/15 px-1.5 text-[9px] text-emerald-300"
      >
        <CheckCircle2 className="h-2.5 w-2.5" />
        Lista
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge
        variant="outline"
        className="h-5 gap-1 border-red-500/40 bg-red-500/15 px-1.5 text-[9px] text-red-300"
      >
        <AlertCircle className="h-2.5 w-2.5" />
        Falló
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="h-5 gap-1 border-[var(--ll-accent)]/40 bg-[var(--ll-accent)]/15 px-1.5 text-[9px] text-[var(--ll-accent)] animate-pulse"
    >
      <Loader2 className="h-2.5 w-2.5 animate-spin" />
      {status === "uploading" ? "Subiendo" : `Codificando${progress != null ? ` ${progress}%` : "…"}`}
    </Badge>
  );
}
