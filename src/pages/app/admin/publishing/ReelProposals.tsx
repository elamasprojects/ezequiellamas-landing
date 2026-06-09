import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Check, Clock, Sparkles, Video as VideoIcon, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/hooks/useSession";
import { useReelProposals } from "@/hooks/useReelProposals";
import {
  approveProposalPublishNow,
  approveProposalSchedule,
  rejectProposal,
  type ProposalMetrics,
  type ReelProposal,
  type ReelProposalStatus,
} from "@/lib/api/reelProposals";

const TABS: { value: ReelProposalStatus | "pending"; label: string }[] = [
  { value: "pending", label: "Pendientes" },
];

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  approved_scheduled: "Programada a IG",
  approved_published: "Publicada en IG",
  rejected: "Rechazada",
};

export default function ReelProposals() {
  const [filter, setFilter] = useState<ReelProposalStatus | "all">("pending");
  const { data: proposals, isLoading } = useReelProposals(
    filter === "all" ? undefined : (filter as ReelProposalStatus),
  );

  return (
    <div className="space-y-8">
      <Link
        to="/app/admin/publishing"
        className="inline-flex items-center gap-1 text-sm"
        style={{ color: "var(--ll-text-muted)" }}
      >
        <ArrowLeft className="h-4 w-4" /> Publicaciones
      </Link>

      <header className="space-y-2">
        <div
          className="text-[10px] uppercase tracking-[0.25em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
        >
          Propuestas de Reels
        </div>
        <h1
          className="text-3xl"
          style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
        >
          Tus <em style={{ color: "var(--ll-warm)" }}>clips que la rompieron</em>
        </h1>
        <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
          Clips que performaron bien en TikTok + YouTube Shorts y vale la pena subir a Instagram. Cada
          propuesta justifica con métricas. Aprobás (programar al próximo slot de IG o publicar ahora)
          o rechazás.
        </p>
      </header>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {(["pending", "approved_scheduled", "approved_published", "rejected", "all"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              filter === s
                ? "border-[var(--ll-accent)] bg-[var(--ll-accent)]/10 text-[var(--ll-accent)]"
                : "border-[var(--ll-border)] text-[var(--ll-text-muted)] hover:text-[var(--ll-text)]"
            }`}
          >
            {s === "all" ? "Todas" : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full bg-[var(--ll-surface)]" />
          <Skeleton className="h-40 w-full bg-[var(--ll-surface)]" />
        </div>
      ) : !proposals || proposals.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-3">
          {proposals.map((p) => (
            <li key={p.id}>
              <ProposalCard proposal={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProposalCard({ proposal }: { proposal: ReelProposal }) {
  const { user } = useSession();
  const qc = useQueryClient();
  const metrics = (proposal.metrics ?? {}) as ProposalMetrics;
  const tt = metrics.by_platform?.tiktok;
  const yt = metrics.by_platform?.youtube;
  const isPending = proposal.status === "pending";

  const invalidate = () => qc.invalidateQueries({ queryKey: ["reel-proposals"] });

  const schedule = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("not authenticated");
      return approveProposalSchedule(proposal, user.id);
    },
    onSuccess: (date) => {
      invalidate();
      toast.success(
        `Programado a Instagram: ${date.toLocaleString("es-AR", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}`,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publishNowM = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("not authenticated");
      return approveProposalPublishNow(proposal, user.id);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Publicando en Instagram…");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: () => rejectProposal(proposal.id),
    onSuccess: () => {
      invalidate();
      toast.success("Propuesta rechazada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const busy = schedule.isPending || publishNowM.isPending || reject.isPending;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4 sm:flex-row">
      {/* Thumbnail */}
      <div className="h-40 w-full shrink-0 overflow-hidden rounded-md bg-black sm:h-32 sm:w-24">
        {proposal.thumbnail_url ? (
          <img src={proposal.thumbnail_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <VideoIcon className="h-6 w-6" style={{ color: "var(--ll-text-dim)" }} />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium" style={{ color: "var(--ll-text)" }}>
              {proposal.title || "Clip sin título"}
            </div>
            {!isPending && (
              <span
                className="text-[10px] uppercase tracking-[0.15em]"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
              >
                {STATUS_LABEL[proposal.status] ?? proposal.status}
              </span>
            )}
          </div>
        </div>

        {/* Justification */}
        <div
          className="flex items-start gap-2 rounded-md border border-[var(--ll-accent)]/30 bg-[var(--ll-accent)]/10 p-2.5 text-xs"
          style={{ color: "var(--ll-text)" }}
        >
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "var(--ll-accent)" }} />
          <span>{proposal.justification}</span>
        </div>

        {/* Metrics chips */}
        <div
          className="flex flex-wrap gap-2 text-[11px]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
        >
          {tt && <Chip label="TikTok" value={`${fmtNum(tt.views)} views`} />}
          {yt && <Chip label="YT Shorts" value={`${fmtNum(yt.views)} views`} />}
          <Chip label="Total" value={`${fmtNum(metrics.total_views ?? 0)} views`} accent />
          {metrics.engagement_rate != null && (
            <Chip label="Engagement" value={`${metrics.engagement_rate}%`} />
          )}
        </div>

        {/* Actions */}
        {isPending && (
          <div className="flex flex-wrap gap-2">
            <Button variant="brand" size="sm" disabled={busy} onClick={() => schedule.mutate()}>
              <Calendar className="h-4 w-4" /> Programar a IG
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-[var(--ll-border)]"
              disabled={busy}
              onClick={() => publishNowM.mutate()}
            >
              <Zap className="h-4 w-4" /> Publicar ahora
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-[var(--ll-text-muted)] hover:text-red-400"
              disabled={busy}
              onClick={() => reject.mutate()}
            >
              <X className="h-4 w-4" /> Rechazar
            </Button>
          </div>
        )}
        {proposal.status === "approved_scheduled" && proposal.instagram_scheduled_post_id && (
          <Link
            to={`/app/admin/publishing/${proposal.instagram_scheduled_post_id}`}
            className="inline-flex items-center gap-1 text-xs"
            style={{ color: "var(--ll-accent)" }}
          >
            <Clock className="h-3.5 w-3.5" /> Ver post programado
          </Link>
        )}
      </div>
    </div>
  );
}

function Chip({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5"
      style={{
        borderColor: accent ? "var(--ll-accent)" : "var(--ll-border)",
        color: accent ? "var(--ll-accent)" : "var(--ll-text-dim)",
      }}
    >
      <span style={{ opacity: 0.7 }}>{label}</span>
      <span style={{ color: "var(--ll-text)" }}>{value}</span>
    </span>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-8 text-center md:p-12">
      <div
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: "var(--ll-accent-dim)" }}
      >
        <Check className="h-5 w-5" style={{ color: "var(--ll-accent)" }} />
      </div>
      <h3 className="text-xl" style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}>
        No hay propuestas por ahora
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--ll-text-muted)" }}>
        Subí clips desde la subida en lote marcándolos como clips. A los días configurados, los que
        mejor performaron aparecen acá listos para subir a Instagram.
      </p>
    </div>
  );
}
