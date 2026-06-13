import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, CalendarClock, Loader2, Send, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScheduledPost } from "@/hooks/useScheduledPost";
import { PublishLogs } from "@/components/publishing/PublishLogs";
import { ViralityPrediction } from "@/components/publishing/ViralityPrediction";
import { PublishStatusPill } from "@/components/publishing/PublishStatusPill";
import { PlatformBadge } from "@/components/publishing/PlatformBadge";
import { cancelScheduledPost, deleteScheduledPost, updateScheduledPost } from "@/lib/api/scheduledPosts";
import { publishNow } from "@/lib/api/publishing";
import type { PublishPlatform } from "@/lib/publishing/platformLimits";

export default function ScheduledPostDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: post, isLoading } = useScheduledPost(id);

  const cancel = useMutation({
    mutationFn: () => cancelScheduledPost(id!),
    onSuccess: () => {
      toast.success("Post cancelado");
      qc.invalidateQueries({ queryKey: ["scheduled-post", id] });
      qc.invalidateQueries({ queryKey: ["scheduled-posts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: () => deleteScheduledPost(id!),
    onSuccess: () => {
      toast.success("Post eliminado");
      qc.invalidateQueries({ queryKey: ["scheduled-posts"] });
      navigate("/app/admin/publishing");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publishAll = useMutation({
    mutationFn: () => publishNow({ scheduled_post_id: id! }),
    onSuccess: () => {
      toast.success("Publicación iniciada");
      qc.invalidateQueries({ queryKey: ["scheduled-post", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Flip a draft (e.g. created by "Predecir alcance") to scheduled so the cron picks it up.
  const schedule = useMutation({
    mutationFn: () => updateScheduledPost(id!, { status: "scheduled" }),
    onSuccess: () => {
      toast.success("Post programado");
      qc.invalidateQueries({ queryKey: ["scheduled-post", id] });
      qc.invalidateQueries({ queryKey: ["scheduled-posts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm" style={{ color: "var(--ll-text-muted)" }}>
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
      </div>
    );
  }

  if (!post) {
    return (
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/app/admin/publishing">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
        </Button>
        <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
          Post no encontrado.
        </p>
      </div>
    );
  }

  const captionsByPlatform = (post.captions ?? {}) as Record<string, string>;
  const date = new Date(post.scheduled_at);
  const platforms = post.publish_jobs.map((j) => j.platform as PublishPlatform);

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-[var(--ll-text-muted)]">
          <Link to="/app/admin/publishing">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
        </Button>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <PublishStatusPill status={post.status} />
            <h1
              className="text-2xl md:text-3xl"
              style={{
                fontFamily: "'Instrument Serif', serif",
                letterSpacing: "-0.025em",
                lineHeight: 1.1,
              }}
            >
              {post.title || (
                <em style={{ color: "var(--ll-text-dim)" }}>Sin título</em>
              )}
            </h1>
            <div
              className="flex flex-wrap items-center gap-2 text-sm"
              style={{ color: "var(--ll-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}
            >
              <span>{date.toLocaleString("es-AR")}</span>
              <span>·</span>
              <span>{post.asset_kind === "video" ? "Video" : "Carrousel"}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {post.status === "draft" && (
              <Button
                variant="brand"
                size="sm"
                disabled={schedule.isPending}
                onClick={() => schedule.mutate()}
                title="Dejar programado para su fecha y que se publique solo"
              >
                {schedule.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarClock className="h-4 w-4" />
                )}
                Programar
              </Button>
            )}
            {(post.status === "scheduled" || post.status === "draft") && (
              <Button
                variant={post.status === "draft" ? "outline" : "brand"}
                size="sm"
                disabled={publishAll.isPending}
                onClick={() => publishAll.mutate()}
              >
                {publishAll.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Publicar ahora
              </Button>
            )}
            {(post.status === "scheduled" || post.status === "draft") && (
              <Button
                variant="ghost"
                size="sm"
                disabled={cancel.isPending}
                onClick={() => cancel.mutate()}
                className="text-[var(--ll-text-muted)] hover:text-red-400"
              >
                <X className="h-4 w-4" /> Cancelar
              </Button>
            )}
            {post.status === "cancelled" || post.status === "failed" ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={remove.isPending}
                onClick={() => {
                  if (confirm("¿Eliminar este post programado?")) remove.mutate();
                }}
                className="text-[var(--ll-text-muted)] hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" /> Eliminar
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        <InfoRow label="Plataformas">
          <div className="flex flex-wrap gap-1.5">
            {platforms.map((p) => (
              <PlatformBadge key={p} platform={p} size="sm" />
            ))}
          </div>
        </InfoRow>
        <InfoRow label="Hashtags">
          {post.hashtags.length === 0 ? (
            <span className="text-sm" style={{ color: "var(--ll-text-dim)" }}>
              —
            </span>
          ) : (
            <span className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
              #{post.hashtags.join(" #")}
            </span>
          )}
        </InfoRow>
      </section>

      <section className="space-y-3">
        <SectionHeading>Caption por defecto</SectionHeading>
        <div
          className="whitespace-pre-wrap rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4 text-sm"
          style={{ color: "var(--ll-text)" }}
        >
          {post.caption_default || (
            <span style={{ color: "var(--ll-text-dim)" }} className="italic">
              (vacío)
            </span>
          )}
        </div>

        {Object.keys(captionsByPlatform).length > 0 && (
          <div className="space-y-2">
            <SectionHeading>Overrides por plataforma</SectionHeading>
            {Object.entries(captionsByPlatform).map(([p, text]) => (
              <div
                key={p}
                className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-3 space-y-2"
              >
                <PlatformBadge platform={p as PublishPlatform} size="sm" />
                <p className="whitespace-pre-wrap text-sm" style={{ color: "var(--ll-text)" }}>
                  {text}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {post.asset_kind === "video" && (
        <section className="space-y-3">
          <SectionHeading>Predicción de viralidad</SectionHeading>
          <ViralityPrediction
            scheduledPostId={post.id}
            status={post.status}
            platforms={platforms}
            autoPredict={searchParams.get("predict") === "1"}
          />
        </section>
      )}

      <section className="space-y-3">
        <SectionHeading>Jobs de publicación</SectionHeading>
        <PublishLogs jobs={post.publish_jobs} />
      </section>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-3">
      <div
        className="text-[10px] uppercase tracking-[0.15em]"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
      >
        {label}
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-[10px] uppercase tracking-[0.25em]"
      style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-muted)" }}
    >
      {children}
    </h2>
  );
}
