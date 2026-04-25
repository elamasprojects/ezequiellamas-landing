import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import ScriptStructure from "@/components/app/ScriptStructure";
import BrollList from "@/components/app/BrollList";
import { useVideo } from "@/hooks/useVideo";
import {
  PLATFORM_LABEL,
  TIER_LABEL,
  deleteVideo,
  type PerformanceTier,
  type VideoPlatform,
} from "@/lib/api/videos";
import { cn } from "@/lib/utils";

const TIER_CLASS: Record<PerformanceTier, string> = {
  normal: "border-[var(--ll-border)] text-[var(--ll-text-muted)]",
  "3x": "border-[var(--ll-warm)]/40 bg-[var(--ll-warm)]/15 text-[var(--ll-warm)]",
  "5x": "border-[var(--ll-accent)]/40 bg-[var(--ll-accent)]/15 text-[var(--ll-accent)]",
  outlier: "border-[var(--ll-blue)]/40 bg-[var(--ll-blue)]/15 text-[var(--ll-blue)]",
};

export default function VideoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: video, isLoading } = useVideo(id);
  const [tab, setTab] = useState("general");

  const deleteMutation = useMutation({
    mutationFn: () => deleteVideo(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["videos"] });
      toast.success("Video eliminado");
      navigate("/app/admin/videos", { replace: true });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <Skeleton className="h-96 w-full bg-[var(--ll-surface)]" />;
  if (!video) {
    return (
      <div className="space-y-4">
        <p style={{ color: "var(--ll-text-muted)" }}>Video no encontrado.</p>
        <Button asChild variant="outline">
          <Link to="/app/admin/videos">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
        </Button>
      </div>
    );
  }

  const tier = video.performance_tier as PerformanceTier | null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="-ml-3 text-[var(--ll-text-muted)]">
          <Link to="/app/admin/videos">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (confirm("¿Eliminar este video?")) deleteMutation.mutate();
          }}
          disabled={deleteMutation.isPending}
          className="text-[var(--ll-text-muted)] hover:text-red-400"
        >
          <Trash2 className="h-4 w-4" /> Eliminar
        </Button>
      </div>

      <header className="flex items-start gap-6">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt=""
            className="h-32 w-32 shrink-0 rounded-lg border border-[var(--ll-border)] object-cover"
          />
        ) : (
          <div className="h-32 w-32 shrink-0 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)]" />
        )}
        <div className="space-y-2 min-w-0">
          <div
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
          >
            {video.source_platform ? PLATFORM_LABEL[video.source_platform as VideoPlatform] : "Video"}
          </div>
          <h1
            className="text-3xl truncate"
            style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
          >
            {video.title || "Sin título"}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm" style={{ color: "var(--ll-text-muted)" }}>
            {video.posted_at && (
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {new Date(video.posted_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            )}
            {video.formats?.name && (
              <Badge variant="outline" className="border-[var(--ll-border)] text-[var(--ll-text-muted)]">
                {video.formats.name}
              </Badge>
            )}
            {tier && video.multiplier !== null && (
              <Badge variant="outline" className={cn("border", TIER_CLASS[tier])}>
                {Number(video.multiplier).toFixed(1)}× {TIER_LABEL[tier]}
              </Badge>
            )}
            {video.source_url && (
              <a
                href={video.source_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs"
                style={{ color: "var(--ll-accent)" }}
              >
                Ver en plataforma <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="border border-[var(--ll-border)] bg-[var(--ll-surface)]">
          <TabsTrigger value="general" className="data-[state=active]:bg-[var(--ll-surface-2)]">
            General
          </TabsTrigger>
          <TabsTrigger value="guion" className="data-[state=active]:bg-[var(--ll-surface-2)]">
            Guion
          </TabsTrigger>
          <TabsTrigger value="metricas" className="data-[state=active]:bg-[var(--ll-surface-2)]">
            Métricas
          </TabsTrigger>
          <TabsTrigger value="asesor" className="data-[state=active]:bg-[var(--ll-surface-2)]" disabled>
            Asesor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6 space-y-4">
          <Card label="URL">
            <a
              href={video.source_url ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="break-all text-sm"
              style={{ color: "var(--ll-accent)" }}
            >
              {video.source_url || "—"}
            </a>
          </Card>
          {video.caption && (
            <Card label="Caption">
              <p className="whitespace-pre-wrap text-sm" style={{ color: "var(--ll-text)" }}>
                {video.caption}
              </p>
            </Card>
          )}
          {video.notes && (
            <Card label="Notas internas">
              <p className="whitespace-pre-wrap text-sm" style={{ color: "var(--ll-text)" }}>
                {video.notes}
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="guion" className="mt-6">
          {video.scripts ? (
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <ScriptStructure
                hook={video.scripts.hook}
                development={video.scripts.development}
                cta={video.scripts.cta}
              />
              <aside className="space-y-6">
                <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-5">
                  <div
                    className="mb-3 text-[10px] uppercase tracking-[0.2em]"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-warm)" }}
                  >
                    B-rolls
                  </div>
                  <BrollList brolls={video.scripts.broll_suggestions} />
                </div>
                <Button asChild variant="ghost" size="sm" className="w-full">
                  <Link to={`/app/admin/ideas/${video.scripts.id}`}>
                    Editar guion <ArrowLeft className="h-3 w-3 rotate-180" />
                  </Link>
                </Button>
              </aside>
            </div>
          ) : (
            <Card label="Guion vinculado">
              <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
                Este video no tiene guion vinculado. Podés vincular uno editando el video.
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="metricas" className="mt-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Metric label="Views totales" value={video.views_total} />
            <Metric label="Multiplier" value={video.multiplier !== null ? `${Number(video.multiplier).toFixed(2)}×` : null} />
            <Metric label="Likes" value={video.likes} />
            <Metric label="Comentarios" value={video.comments} />
            <Metric label="Shares" value={video.shares} />
            <Metric label="Saves" value={video.saves} />
            <Metric label="Reach" value={video.reach} />
            <Metric label="Watch time (s)" value={video.watch_time_seconds} />
            <Metric label="Retención (%)" value={video.retention_pct} />
            <Metric label="Views orgánicos" value={video.views_organic} />
            <Metric label="Views pagos" value={video.views_paid} />
            <Metric label="Spend (USD)" value={video.spend} />
          </div>
        </TabsContent>

        <TabsContent value="asesor" className="mt-6">
          <Card label="Asesor">
            <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
              El feedback del asesor entra en M7.
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Card({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-5">
      <div
        className="mb-2 text-[10px] uppercase tracking-[0.2em]"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-muted)" }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string | null | undefined }) {
  return (
    <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4">
      <div
        className="text-[10px] uppercase tracking-[0.15em]"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-muted)" }}
      >
        {label}
      </div>
      <div
        className="mt-2 text-2xl"
        style={{ fontFamily: "'Instrument Serif', serif", color: "var(--ll-text)", lineHeight: 1 }}
      >
        {value === null || value === undefined ? (
          <span style={{ color: "var(--ll-text-dim)" }}>—</span>
        ) : (
          formatValue(value)
        )}
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
