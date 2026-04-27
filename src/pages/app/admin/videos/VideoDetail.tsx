import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
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
import FeedbackThread from "@/components/app/FeedbackThread";
import PlatformIcon from "@/components/app/PlatformIcon";
import PlatformSwitcher, { type PlatformView } from "@/components/app/PlatformSwitcher";
import PlatformMetricsCard from "@/components/app/PlatformMetricsCard";
import VideoEmbed from "@/components/app/VideoEmbed";
import AddPlatformDialog from "@/components/app/AddPlatformDialog";
import { useVideo } from "@/hooks/useVideo";
import {
  TIER_LABEL,
  deleteVideo,
  isSyncable,
  platformsPresent,
  primaryPost,
  postByPlatform,
  syncVideoPost,
  transcribeVideo,
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
  const [metricsView, setMetricsView] = useState<PlatformView>("all");
  const [embedView, setEmbedView] = useState<PlatformView>("all");
  const [addPlatformOpen, setAddPlatformOpen] = useState(false);
  const [pendingPostIds, setPendingPostIds] = useState<Set<string>>(new Set());

  const deleteMutation = useMutation({
    mutationFn: () => deleteVideo(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["videos"] });
      toast.success("Video eliminado");
      navigate("/app/admin/videos", { replace: true });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const syncMutation = useMutation({
    mutationFn: (post_id: string) => syncVideoPost(post_id),
    onMutate: (post_id) => setPendingPostIds((prev) => new Set(prev).add(post_id)),
    onSettled: (_d, _e, post_id) =>
      setPendingPostIds((prev) => {
        const next = new Set(prev);
        next.delete(post_id);
        return next;
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["video", id] });
      qc.invalidateQueries({ queryKey: ["videos"] });
      toast.success("Métricas actualizadas");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const transcribeMutation = useMutation({
    mutationFn: () => transcribeVideo(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["video", id] });
      toast.success("Transcripción lista");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Poll while transcript is processing
  useQuery({
    queryKey: ["video", id, "transcript-poll"],
    queryFn: async () => {
      qc.invalidateQueries({ queryKey: ["video", id] });
      return null;
    },
    enabled: video?.transcript_status === "processing",
    refetchInterval: 4000,
  });

  const present = useMemo<VideoPlatform[]>(() => {
    if (!video) return [];
    return platformsPresent(video.posts).filter((p) => p !== "other");
  }, [video]);

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
  const primary = primaryPost(video.posts);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="-ml-3 text-[var(--ll-text-muted)]">
          <Link to="/app/admin/videos">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddPlatformOpen(true)}
            className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]"
          >
            <Plus className="h-4 w-4" /> Vincular otra plataforma
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
      </div>

      <header className="flex items-start gap-6">
        {primary?.thumbnail_url ? (
          <img
            src={primary.thumbnail_url}
            alt=""
            className="h-32 w-32 shrink-0 rounded-lg border border-[var(--ll-border)] object-cover"
          />
        ) : (
          <div className="h-32 w-32 shrink-0 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)]" />
        )}
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2">
            {present.map((p) => (
              <PlatformIcon key={p} platform={p} className="h-4 w-4" />
            ))}
            {present.length === 0 && (
              <span
                className="text-[10px] uppercase tracking-[0.25em]"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
              >
                Sin plataforma
              </span>
            )}
          </div>
          <h1
            className="text-3xl truncate"
            style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
          >
            {video.title || "Sin título"}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm" style={{ color: "var(--ll-text-muted)" }}>
            {primary?.posted_at && (
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {new Date(primary.posted_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
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
          </div>
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="border border-[var(--ll-border)] bg-[var(--ll-surface)]">
          <TabsTrigger value="general" className="data-[state=active]:bg-[var(--ll-surface-2)]">General</TabsTrigger>
          <TabsTrigger value="guion" className="data-[state=active]:bg-[var(--ll-surface-2)]">Guion</TabsTrigger>
          <TabsTrigger value="metricas" className="data-[state=active]:bg-[var(--ll-surface-2)]">Métricas</TabsTrigger>
          <TabsTrigger value="reproducir" className="data-[state=active]:bg-[var(--ll-surface-2)]">Reproducir</TabsTrigger>
          <TabsTrigger value="transcripcion" className="data-[state=active]:bg-[var(--ll-surface-2)]">Transcripción</TabsTrigger>
          <TabsTrigger value="asesor" className="data-[state=active]:bg-[var(--ll-surface-2)]">Asesor</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6 space-y-4">
          {video.posts.map((p) => (
            <Card key={p.id} label={
              <span className="inline-flex items-center gap-2">
                <PlatformIcon platform={p.platform as VideoPlatform} className="h-3.5 w-3.5" />
                {p.platform}
              </span>
            }>
              <a href={p.source_url} target="_blank" rel="noreferrer" className="break-all text-sm" style={{ color: "var(--ll-accent)" }}>
                {p.source_url}
              </a>
              {p.caption && (
                <p className="mt-3 whitespace-pre-wrap text-sm" style={{ color: "var(--ll-text)" }}>
                  {p.caption}
                </p>
              )}
              <div className="mt-3 flex items-center gap-3 text-xs" style={{ color: "var(--ll-text-muted)" }}>
                <a
                  href={p.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1"
                  style={{ color: "var(--ll-accent)" }}
                >
                  Ver en plataforma <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </Card>
          ))}
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

        <TabsContent value="metricas" className="mt-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <PlatformSwitcher value={metricsView} onChange={setMetricsView} available={present} />
            <div className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
              {video.views_total_aggregate !== null && (
                <>
                  Total combinado:{" "}
                  <strong style={{ color: "var(--ll-text)" }}>
                    {formatBigNum(video.views_total_aggregate)} views
                  </strong>
                </>
              )}
            </div>
          </div>

          {metricsView === "all" ? (
            video.posts.length === 0 ? (
              <EmptyMetrics />
            ) : (
              <div className="space-y-4">
                {video.posts.map((p) => (
                  <PlatformMetricsCard
                    key={p.id}
                    post={p}
                    compact
                    pending={pendingPostIds.has(p.id)}
                    onSync={() => syncMutation.mutate(p.id)}
                  />
                ))}
              </div>
            )
          ) : (
            (() => {
              const post = postByPlatform(video.posts, metricsView);
              if (!post) return <EmptyMetrics />;
              return (
                <PlatformMetricsCard
                  post={post}
                  pending={pendingPostIds.has(post.id)}
                  onSync={() => syncMutation.mutate(post.id)}
                />
              );
            })()
          )}
        </TabsContent>

        <TabsContent value="reproducir" className="mt-6 space-y-4">
          <PlatformSwitcher value={embedView} onChange={setEmbedView} available={present} />
          {video.posts.length === 0 ? (
            <Card label="Reproducir">
              <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
                Vinculá una plataforma para poder reproducir el video desde acá.
              </p>
            </Card>
          ) : embedView === "all" ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {video.posts.map((p) => (
                <VideoEmbed key={p.id} post={p} />
              ))}
            </div>
          ) : (
            (() => {
              const post = postByPlatform(video.posts, embedView);
              if (!post) return <Card label="Reproducir">No hay post de esa plataforma.</Card>;
              return <VideoEmbed post={post} />;
            })()
          )}
        </TabsContent>

        <TabsContent value="transcripcion" className="mt-6 space-y-4">
          <TranscriptPanel
            video={video}
            onTranscribe={() => transcribeMutation.mutate()}
            transcribing={transcribeMutation.isPending}
            anySyncable={video.posts.some((p) => isSyncable(p.platform))}
          />
        </TabsContent>

        <TabsContent value="asesor" className="mt-6">
          <FeedbackThread
            videoId={video.id}
            videoTitle={video.title || "Sin título"}
            adminId={video.owner_id}
            canWrite
          />
        </TabsContent>
      </Tabs>

      <AddPlatformDialog
        open={addPlatformOpen}
        onOpenChange={setAddPlatformOpen}
        videoId={video.id}
        existingPlatforms={present}
      />
    </div>
  );
}

function TranscriptPanel({
  video,
  onTranscribe,
  transcribing,
  anySyncable,
}: {
  video: { transcript: string | null; transcript_status: string | null; transcript_error: string | null; transcript_language: string | null };
  onTranscribe: () => void;
  transcribing: boolean;
  anySyncable: boolean;
}) {
  const status = video.transcript_status ?? "pending";

  if (status === "processing" || transcribing) {
    return (
      <Card label="Transcripción">
        <div className="flex items-center gap-3" style={{ color: "var(--ll-text-muted)" }}>
          <Wand2 className="h-4 w-4 animate-pulse" style={{ color: "var(--ll-accent)" }} />
          <span>Transcribiendo el audio… puede tardar 30-90 segundos.</span>
        </div>
      </Card>
    );
  }

  if (status === "done" && video.transcript) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span
            className="text-xs uppercase tracking-[0.2em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
          >
            Transcripción {video.transcript_language && `· ${video.transcript_language}`}
          </span>
          <Button variant="ghost" size="sm" onClick={onTranscribe} disabled={!anySyncable}>
            <Wand2 className="h-3.5 w-3.5" /> Re-transcribir
          </Button>
        </div>
        <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-5">
          <pre
            className="whitespace-pre-wrap text-sm leading-relaxed"
            style={{ color: "var(--ll-text)", fontFamily: "inherit" }}
          >
            {video.transcript}
          </pre>
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <Card label="Transcripción">
        <p className="text-sm text-red-400">Falló la transcripción: {video.transcript_error}</p>
        <Button variant="brand" size="sm" onClick={onTranscribe} className="mt-3" disabled={!anySyncable}>
          <Wand2 className="h-3.5 w-3.5" /> Reintentar
        </Button>
      </Card>
    );
  }

  // pending
  return (
    <Card label="Transcripción">
      <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
        Sacamos el audio del video y lo pasamos por Whisper. Toma unos segundos.
      </p>
      <Button variant="brand" size="sm" onClick={onTranscribe} disabled={!anySyncable} className="mt-3">
        <Wand2 className="h-3.5 w-3.5" /> Transcribir audio
      </Button>
      {!anySyncable && (
        <p className="mt-2 text-xs" style={{ color: "var(--ll-text-dim)" }}>
          Necesitás al menos una plataforma sincronizable (IG, YT o TT) vinculada.
        </p>
      )}
    </Card>
  );
}

function EmptyMetrics() {
  return (
    <Card label="Métricas">
      <div className="flex items-center gap-2 text-sm" style={{ color: "var(--ll-text-muted)" }}>
        <Sparkles className="h-4 w-4" />
        Vinculá una plataforma o sincronizá para ver métricas.
      </div>
    </Card>
  );
}

function Card({ label, children }: { label: ReactNode; children: ReactNode }) {
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

function formatBigNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
