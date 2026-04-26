import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, RefreshCw, Sparkles, Video as VideoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useVideos } from "@/hooks/useVideos";
import { useFormats } from "@/hooks/useFormats";
import {
  PLATFORM_LABEL,
  TIER_LABEL,
  isSyncable,
  syncVideoMetrics,
  type PerformanceTier,
  type Video,
  type VideoFilters,
  type VideoPlatform,
} from "@/lib/api/videos";
import { cn } from "@/lib/utils";

const ALL = "__all__";

const TIER_CLASS: Record<PerformanceTier, string> = {
  normal: "border-[var(--ll-border)] text-[var(--ll-text-muted)]",
  "3x": "border-[var(--ll-warm)]/40 bg-[var(--ll-warm)]/15 text-[var(--ll-warm)]",
  "5x": "border-[var(--ll-accent)]/40 bg-[var(--ll-accent)]/15 text-[var(--ll-accent)]",
  outlier: "border-[var(--ll-blue)]/40 bg-[var(--ll-blue)]/15 text-[var(--ll-blue)]",
};

export default function VideosList() {
  const [platform, setPlatform] = useState<string>(ALL);
  const [formatId, setFormatId] = useState<string>(ALL);
  const [tier, setTier] = useState<string>(ALL);
  const [sort, setSort] = useState<NonNullable<VideoFilters["sort"]>>("posted_at_desc");

  const { data: formats } = useFormats();

  const filters: VideoFilters = {
    platform: platform === ALL ? undefined : (platform as VideoPlatform),
    format_id: formatId === ALL ? undefined : formatId,
    performance_tier: tier === ALL ? undefined : (tier as PerformanceTier),
    sort,
  };

  const { data: videos, isLoading } = useVideos(filters);

  const formatsById = new Map((formats ?? []).map((f) => [f.id, f.name]));

  const qc = useQueryClient();
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const syncMutation = useMutation({
    mutationFn: (id: string) => syncVideoMetrics(id),
    onMutate: (id) => {
      setPendingIds((prev) => new Set(prev).add(id));
    },
    onSettled: (_data, _err, id) => {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["video", id] });
      qc.invalidateQueries({ queryKey: ["videos"] });
      toast.success("Métricas actualizadas");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSync = (id: string) => syncMutation.mutate(id);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
          >
            Videos
          </div>
          <h1
            className="text-2xl md:text-3xl"
            style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
          >
            Tus <em style={{ color: "var(--ll-warm)" }}>videos</em> posteados
          </h1>
          <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
            Pegás la URL del video y traemos las métricas (views, likes, comments) automáticamente para Instagram,
            YouTube y TikTok. La columna multiplier compara views vs el promedio de los últimos 90 días.
          </p>
        </div>
        <Button asChild variant="brand" className="self-start sm:self-auto">
          <Link to="/app/admin/videos/new">
            <Plus className="h-4 w-4" /> Nuevo video
          </Link>
        </Button>
      </header>

      <div className="-mx-1 flex flex-wrap gap-3 px-1">
        <FilterSelect
          label="Plataforma"
          value={platform}
          onChange={setPlatform}
          options={[
            { value: ALL, label: "Todas" },
            { value: "instagram", label: "Instagram" },
            { value: "youtube", label: "YouTube" },
            { value: "tiktok", label: "TikTok" },
            { value: "other", label: "Otra" },
          ]}
        />
        <FilterSelect
          label="Formato"
          value={formatId}
          onChange={setFormatId}
          options={[
            { value: ALL, label: "Todos" },
            ...(formats ?? []).map((f) => ({ value: f.id, label: f.name })),
          ]}
        />
        <FilterSelect
          label="Performance"
          value={tier}
          onChange={setTier}
          options={[
            { value: ALL, label: "Todos" },
            { value: "normal", label: "Normal" },
            { value: "3x", label: "3×" },
            { value: "5x", label: "5×" },
            { value: "outlier", label: "Outlier" },
          ]}
        />
        <FilterSelect
          label="Orden"
          value={sort}
          onChange={(v) => setSort(v as VideoFilters["sort"] & string)}
          options={[
            { value: "posted_at_desc", label: "Más recientes" },
            { value: "views_desc", label: "Más vistos" },
            { value: "multiplier_desc", label: "Mejor multiplier" },
          ]}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full bg-[var(--ll-surface)]" />
          <Skeleton className="h-20 w-full bg-[var(--ll-surface)]" />
          <Skeleton className="h-20 w-full bg-[var(--ll-surface)]" />
        </div>
      ) : !videos || videos.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <ul className="space-y-3 md:hidden">
            {videos.map((v) => (
              <li key={v.id}>
                <VideoCard
                  video={v}
                  formatName={v.format_id ? formatsById.get(v.format_id) : undefined}
                  pending={pendingIds.has(v.id)}
                  onSync={handleSync}
                />
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--ll-border)] hover:bg-transparent">
                  <TableHead className="w-16" style={{ color: "var(--ll-text-muted)" }}></TableHead>
                  <TableHead style={{ color: "var(--ll-text-muted)" }}>Título</TableHead>
                  <TableHead style={{ color: "var(--ll-text-muted)" }}>Plataforma</TableHead>
                  <TableHead style={{ color: "var(--ll-text-muted)" }}>Formato</TableHead>
                  <TableHead style={{ color: "var(--ll-text-muted)" }}>Fecha</TableHead>
                  <TableHead className="text-right" style={{ color: "var(--ll-text-muted)" }}>
                    Views
                  </TableHead>
                  <TableHead className="text-right" style={{ color: "var(--ll-text-muted)" }}>
                    Multiplier
                  </TableHead>
                  <TableHead className="text-right" style={{ color: "var(--ll-text-muted)" }}>
                    Sync
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {videos.map((v) => (
                  <TableRow
                    key={v.id}
                    className="cursor-pointer border-[var(--ll-border)]"
                    onClick={() => (window.location.href = `/app/admin/videos/${v.id}`)}
                  >
                    <TableCell>
                      {v.thumbnail_url ? (
                        <img src={v.thumbnail_url} alt="" className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded"
                          style={{ background: "var(--ll-surface-2)", color: "var(--ll-text-dim)" }}
                        >
                          <VideoIcon className="h-4 w-4" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium" style={{ color: "var(--ll-text)" }}>
                      {v.title || (
                        <span style={{ color: "var(--ll-text-dim)" }} className="italic">
                          sin título
                        </span>
                      )}
                    </TableCell>
                    <TableCell style={{ color: "var(--ll-text-muted)" }}>
                      {v.source_platform ? PLATFORM_LABEL[v.source_platform as VideoPlatform] : "—"}
                    </TableCell>
                    <TableCell>
                      {v.format_id && formatsById.get(v.format_id) ? (
                        <Badge variant="outline" className="border-[var(--ll-border)] text-[var(--ll-text-muted)]">
                          {formatsById.get(v.format_id)}
                        </Badge>
                      ) : (
                        <span style={{ color: "var(--ll-text-dim)" }}>—</span>
                      )}
                    </TableCell>
                    <TableCell
                      className="text-xs"
                      style={{ color: "var(--ll-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {v.posted_at ? new Date(v.posted_at).toLocaleDateString("es-AR") : "—"}
                    </TableCell>
                    <TableCell className="text-right" style={{ color: "var(--ll-text)" }}>
                      {v.views_total !== null ? formatNum(v.views_total) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {v.multiplier !== null && v.performance_tier ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            "ml-auto inline-flex border",
                            TIER_CLASS[v.performance_tier as PerformanceTier],
                          )}
                        >
                          {Number(v.multiplier).toFixed(1)}× {TIER_LABEL[v.performance_tier as PerformanceTier]}
                        </Badge>
                      ) : (
                        <span style={{ color: "var(--ll-text-dim)" }}>—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <SyncCell video={v} pending={pendingIds.has(v.id)} onSync={handleSync} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

function VideoCard({
  video,
  formatName,
  pending,
  onSync,
}: {
  video: Video;
  formatName?: string;
  pending: boolean;
  onSync: (id: string) => void;
}) {
  const tier = video.performance_tier as PerformanceTier | null;
  return (
    <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-3">
      <Link
        to={`/app/admin/videos/${video.id}`}
        className="flex gap-3 transition-colors active:bg-[var(--ll-surface-2)]"
      >
        {video.thumbnail_url ? (
          <img src={video.thumbnail_url} alt="" className="h-16 w-16 shrink-0 rounded object-cover" />
        ) : (
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded"
            style={{ background: "var(--ll-surface-2)", color: "var(--ll-text-dim)" }}
          >
            <VideoIcon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-medium" style={{ color: "var(--ll-text)" }}>
              {video.title || (
                <span className="italic" style={{ color: "var(--ll-text-dim)" }}>
                  sin título
                </span>
              )}
            </h3>
            {tier && video.multiplier !== null && (
              <Badge variant="outline" className={cn("shrink-0 border", TIER_CLASS[tier])}>
                {Number(video.multiplier).toFixed(1)}×
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs" style={{ color: "var(--ll-text-muted)" }}>
            {video.source_platform && <span>{PLATFORM_LABEL[video.source_platform as VideoPlatform]}</span>}
            {formatName && (
              <>
                <span style={{ color: "var(--ll-text-dim)" }}>·</span>
                <span>{formatName}</span>
              </>
            )}
            {video.posted_at && (
              <>
                <span style={{ color: "var(--ll-text-dim)" }}>·</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {new Date(video.posted_at).toLocaleDateString("es-AR")}
                </span>
              </>
            )}
          </div>
          {video.views_total !== null && (
            <div
              className="text-xs"
              style={{ color: "var(--ll-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}
            >
              {formatNum(video.views_total)} views
            </div>
          )}
        </div>
      </Link>
      <div className="mt-3 flex items-center justify-end border-t border-[var(--ll-border)] pt-2">
        <SyncCell video={video} pending={pending} onSync={onSync} />
      </div>
    </div>
  );
}

function SyncCell({
  video,
  pending,
  onSync,
}: {
  video: Video;
  pending: boolean;
  onSync: (id: string) => void;
}) {
  const syncable = isSyncable(video.source_platform);
  const time = relTime(video.last_scraped_at);
  return (
    <div className="inline-flex items-center justify-end gap-2">
      <span
        className="text-xs"
        style={{ color: "var(--ll-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}
        title={video.last_scrape_error ?? undefined}
      >
        {video.last_scrape_error && (
          <span className="text-red-400" aria-hidden>
            ●{" "}
          </span>
        )}
        {time ?? <span style={{ color: "var(--ll-text-dim)" }}>—</span>}
      </span>
      {syncable && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          disabled={pending}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onSync(video.id);
          }}
          aria-label="Sincronizar métricas"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", pending && "animate-spin")} />
        </Button>
      )}
    </div>
  );
}

function relTime(iso: string | null): string | null {
  if (!iso) return null;
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: es });
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1">
      <span
        className="text-[10px] uppercase tracking-[0.15em]"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
      >
        {label}
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-36 border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)] sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-8 text-center md:p-12">
      <div
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: "var(--ll-accent-dim)" }}
      >
        <Sparkles className="h-5 w-5" style={{ color: "var(--ll-accent)" }} />
      </div>
      <h3 className="text-xl" style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}>
        Todavía no cargaste ningún video posteado
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--ll-text-muted)" }}>
        Cargás la URL de cada video que posteaste. Las métricas las podés sincronizar con un click si es de Instagram,
        YouTube o TikTok. Con 2+ videos calculamos el multiplier vs tu promedio.
      </p>
      <Button asChild variant="brand" className="mt-6">
        <Link to="/app/admin/videos/new">
          <Plus className="h-4 w-4" /> Cargar tu primer video
        </Link>
      </Button>
    </div>
  );
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
