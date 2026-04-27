import { CheckCircle2, XCircle, Clock, Loader2, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PublishJob } from "@/lib/api/scheduledPosts";
import { markJobPublished } from "@/lib/api/scheduledPosts";
import { publishNow } from "@/lib/api/publishing";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PlatformBadge } from "./PlatformBadge";
import type { PublishPlatform } from "@/lib/publishing/platformLimits";

const STATUS_ICON: Record<PublishJob["status"], typeof CheckCircle2> = {
  pending: Clock,
  in_progress: Loader2,
  awaiting_user: AlertTriangle,
  succeeded: CheckCircle2,
  failed: XCircle,
  cancelled: XCircle,
};

const STATUS_COLOR: Record<PublishJob["status"], string> = {
  pending: "text-[var(--ll-text-muted)]",
  in_progress: "text-[var(--ll-warm)]",
  awaiting_user: "text-[var(--ll-warm)]",
  succeeded: "text-[var(--ll-accent)]",
  failed: "text-red-400",
  cancelled: "text-[var(--ll-text-dim)]",
};

const STATUS_LABEL: Record<PublishJob["status"], string> = {
  pending: "Pendiente",
  in_progress: "Publicando",
  awaiting_user: "Esperando tu acción",
  succeeded: "Publicado",
  failed: "Falló",
  cancelled: "Cancelado",
};

export function PublishLogs({ jobs }: { jobs: PublishJob[] }) {
  const qc = useQueryClient();

  const retry = useMutation({
    mutationFn: (job: PublishJob) =>
      publishNow({ scheduled_post_id: job.scheduled_post_id, platform: job.platform as PublishPlatform }),
    onSuccess: () => {
      toast.success("Reintentando…");
      qc.invalidateQueries({ queryKey: ["scheduled-post"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const markDone = useMutation({
    mutationFn: (jobId: string) => markJobPublished(jobId),
    onSuccess: () => {
      toast.success("Marcado como publicado");
      qc.invalidateQueries({ queryKey: ["scheduled-post"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (jobs.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
        Este post no tiene jobs de publicación.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {jobs.map((job) => {
        const Icon = STATUS_ICON[job.status];
        return (
          <li
            key={job.id}
            className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <PlatformBadge platform={job.platform as PublishPlatform} size="sm" />
                <div className={`flex items-center gap-1.5 text-xs ${STATUS_COLOR[job.status]}`}>
                  <Icon
                    className={
                      job.status === "in_progress"
                        ? "h-3.5 w-3.5 animate-spin"
                        : "h-3.5 w-3.5"
                    }
                  />
                  <span>{STATUS_LABEL[job.status]}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {job.provider_post_url && (
                  <a
                    href={job.provider_post_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs"
                    style={{ color: "var(--ll-accent)" }}
                  >
                    Ver post <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {job.status === "failed" && job.attempt < job.max_attempts && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => retry.mutate(job)}
                    disabled={retry.isPending}
                  >
                    Reintentar
                  </Button>
                )}
                {job.status === "awaiting_user" && job.platform === "tiktok" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markDone.mutate(job.id)}
                    disabled={markDone.isPending}
                  >
                    Ya publiqué
                  </Button>
                )}
              </div>
            </div>

            {job.last_error && (
              <p
                className="mt-2 rounded border border-red-500/30 bg-red-500/10 p-2 text-[11px]"
                style={{ color: "#fca5a5", fontFamily: "'JetBrains Mono', monospace" }}
              >
                {job.last_error}
              </p>
            )}

            {(job.started_at || job.finished_at) && (
              <div
                className="mt-2 flex flex-wrap gap-3 text-[10px]"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
              >
                {job.started_at && <span>Inicio: {new Date(job.started_at).toLocaleString("es-AR")}</span>}
                {job.finished_at && <span>Fin: {new Date(job.finished_at).toLocaleString("es-AR")}</span>}
                <span>Intentos: {job.attempt}/{job.max_attempts}</span>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
