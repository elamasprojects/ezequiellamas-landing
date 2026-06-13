import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Play, Plus, RefreshCw, Sparkles, Video as VideoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useVideos } from "@/hooks/useVideos";
import { useFormats } from "@/hooks/useFormats";
import PlatformIcon from "@/components/app/PlatformIcon";
import VideoEmbed from "@/components/app/VideoEmbed";
import {
  TIER_LABEL,
  playablePost,
  primaryPost,
  syncVideosFromZernio,
  type PerformanceTier,
  type VideoFilters,
  type VideoPlatform,
  type VideoWithPosts,
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

  const syncMutation = useMutation({
    mutationFn: () => syncVideosFromZernio(),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["videos"] });
      const errSummary = data.errors.length > 0 ? ` · ${data.errors.length} con error` : "";
      const parts: string[] = [];
      if (data.imported > 0) parts.push(`${data.imported} ${data.imported === 1 ? "nuevo" : "nuevos"}`);
      if (data.merged > 0) parts.push(`${data.merged} ${data.merged === 1 ? "fusionado" : "fusionados"}`);
      if (parts.length > 0) {
        toast.success(`Sincronizado: ${parts.join(", ")} (${data.synced} actualizados)${errSummary}`);
      } else {
        toast.success(`Métricas actualizadas: ${data.synced} videos${errSummary}`);
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

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
            Sincronizamos tus videos y métricas de Instagram, YouTube y TikTok de forma nativa. Un mismo video posteado
            en varias plataformas se agrupa en una sola tarjeta. El multiplier compara las views vs tu promedio de los
            últimos 90 días.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]"
          >
            <RefreshCw className={cn("h-4 w-4", syncMutation.isPending && "animate-spin")} />
            {syncMutation.isPending ? "Sincronizando..." : "Sincronizar"}
          </Button>
          <Button asChild variant="brand">
            <Link to="/app/admin/videos/new">
              <Plus className="h-4 w-4" /> Nuevo video
            </Link>
          </Button>
        </div>
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
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[9/16] w-full bg-[var(--ll-surface)]" />
          ))}
        </div>
      ) : !videos || videos.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {videos.map((v) => (
            <VideoPlayCard
              key={v.id}
              video={v}
              formatName={v.format_id ? formatsById.get(v.format_id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function VideoPlayCard({ video, formatName }: { video: VideoWithPosts; formatName?: string }) {
  const [playing, setPlaying] = useState(false);
  const tier = video.performance_tier as PerformanceTier | null;
  const primary = primaryPost(video.posts);
  const playable = playablePost(video.posts);
  // Prefer the playable platform's thumbnail (IG→YT→TT) so it's a consistent
  // vertical image matching what plays; fall back to any available thumbnail.
  const thumb =
    playable?.thumbnail_url ?? primary?.thumbnail_url ?? video.posts.find((p) => p.thumbnail_url)?.thumbnail_url ?? null;

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)]">
      <div className="relative aspect-[9/16] bg-black">
        {playing && playable ? (
          <VideoEmbed post={playable} bare />
        ) : (
          <button
            type="button"
            onClick={() => playable && setPlaying(true)}
            disabled={!playable}
            className="group relative h-full w-full"
            aria-label={playable ? "Reproducir" : "Sin reproducción disponible"}
          >
            {thumb ? (
              <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center"
                style={{ background: "var(--ll-surface-2)", color: "var(--ll-text-dim)" }}
              >
                <VideoIcon className="h-8 w-8" />
              </div>
            )}
            {playable && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-90 transition-opacity group-hover:bg-black/35 group-hover:opacity-100">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm">
                  <Play className="h-5 w-5 translate-x-[1px] fill-white text-white" />
                </span>
              </div>
            )}
            {tier && video.multiplier !== null && (
              <Badge
                variant="outline"
                className={cn(
                  "absolute right-2 top-2 border bg-black/55 backdrop-blur-sm",
                  TIER_CLASS[tier],
                )}
              >
                {Number(video.multiplier).toFixed(1)}×
              </Badge>
            )}
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <Link
          to={`/app/admin/videos/${video.id}`}
          className="line-clamp-2 text-sm font-medium leading-snug transition-colors hover:text-[var(--ll-accent)]"
          style={{ color: "var(--ll-text)" }}
        >
          {video.title || <span className="italic" style={{ color: "var(--ll-text-dim)" }}>sin título</span>}
        </Link>

        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {video.posts.map((p) => (
              <PlatformIcon key={p.id} platform={p.platform as VideoPlatform} className="h-4 w-4" />
            ))}
            {video.is_clip && (
              <Badge variant="outline" className="border-[var(--ll-accent)]/40 text-[var(--ll-accent)]">
                Clip
              </Badge>
            )}
          </div>
          {tier && video.multiplier !== null && (
            <Badge variant="outline" className={cn("border", TIER_CLASS[tier])}>
              {Number(video.multiplier).toFixed(1)}× {TIER_LABEL[tier]}
            </Badge>
          )}
        </div>

        <div
          className="flex items-center justify-between text-xs"
          style={{ color: "var(--ll-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}
        >
          <span>{video.views_total_aggregate !== null ? `${formatNum(video.views_total_aggregate)} views` : "— views"}</span>
          <span>
            {primary?.posted_at ? new Date(primary.posted_at).toLocaleDateString("es-AR") : "—"}
          </span>
        </div>
        {formatName && (
          <div className="text-[10px] uppercase tracking-[0.12em]" style={{ color: "var(--ll-text-dim)", fontFamily: "'JetBrains Mono', monospace" }}>
            {formatName}
          </div>
        )}
      </div>
    </div>
  );
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
        Todavía no hay videos
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--ll-text-muted)" }}>
        Tocá <strong>Sincronizar</strong> para traer tus videos y métricas desde Instagram, YouTube y TikTok. Los
        videos posteados en varias plataformas se agrupan en una sola tarjeta.
      </p>
      <Button asChild variant="brand" className="mt-6">
        <Link to="/app/admin/videos/new">
          <Plus className="h-4 w-4" /> Cargar un video manualmente
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
