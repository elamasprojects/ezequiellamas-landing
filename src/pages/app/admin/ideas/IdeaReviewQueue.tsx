import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Inbox, EyeOff, Sparkles, Brain, Newspaper, Trophy, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useContentIdeas } from "@/hooks/useContentIdeas";
import { approveIdea, rejectIdea, type ContentIdea } from "@/lib/api/contentIdeas";
import { sendNotification } from "@/lib/api/notifications";
import {
  triggerContentRoutine,
  ROUTINE_LABELS,
  MANUAL_ROUTINES,
  type RoutineSystem,
} from "@/lib/api/contentRoutines";
import { IdeaSwipeCard } from "./IdeaSwipeCard";

const VISIBLE = 3; // cards rendered in the stack for depth

export default function IdeaReviewQueue() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: ideas, isLoading } = useContentIdeas("pending");
  const [showRejected, setShowRejected] = useState(false);
  // Locally hidden as soon as a card flies off, so the queue advances instantly
  // while generation runs in the background. Cleared if the action errors.
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  const dismiss = (id: string) => setDismissed((prev) => new Set(prev).add(id));
  const undismiss = (id: string) =>
    setDismissed((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });

  // Fire-and-forget: NOT a React mutation, so generation keeps running even if the
  // user switches tabs (this component unmounts) — the promise resolves regardless.
  function runApprove(idea: ContentIdea) {
    approveIdea(idea)
      .then(async (scriptId) => {
        qc.invalidateQueries({ queryKey: ["content-ideas"] });
        qc.invalidateQueries({ queryKey: ["scripts"] });
        // Push (+ in-app) when the guion is ready; tapping it opens the script.
        await sendNotification({
          user_id: idea.owner_id,
          kind: "script.ready",
          title: "Tu guion está listo",
          body: (idea.concept ?? "Idea aprobada").slice(0, 120),
          link: `/app/admin/ideas/${scriptId}`,
          send_push: true,
        }).catch(() => {});
        toast.success("Guion generado", {
          action: { label: "Abrir", onClick: () => navigate(`/app/admin/ideas/${scriptId}`) },
        });
      })
      .catch((e: Error) => {
        toast.error(e?.message ?? "No se pudo generar el guion");
        undismiss(idea.id); // bring the card back so it can be retried
      });
  }

  function runReject(id: string) {
    rejectIdea(id)
      .then(() => qc.invalidateQueries({ queryKey: ["content-ideas"] }))
      .catch((e: Error) => {
        toast.error(e?.message ?? "No se pudo descartar");
        undismiss(id);
      });
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg">
        <Skeleton className="h-96 w-full rounded-2xl bg-[var(--ll-surface)]" />
      </div>
    );
  }

  const pending = (ideas ?? []).filter((i) => !dismissed.has(i.id));

  if (pending.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <GenerateIdeasMenu />
        </div>
        <EmptyState />
        <RejectedToggle showRejected={showRejected} setShowRejected={setShowRejected} />
        {showRejected && <RejectedList />}
      </div>
    );
  }

  const stack = pending.slice(0, VISIBLE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
          {pending.length} {pending.length === 1 ? "idea pendiente" : "ideas pendientes"} · deslizá → aprobar, ← descartar
        </p>
        <GenerateIdeasMenu />
      </div>

      {/* Card stack — top card is interactive; the rest are visual depth.
          Approve/reject fly the card off and run generation in the background. */}
      <div className="relative mx-auto h-[520px] max-w-lg">
        {stack
          .map((idea, depth) => (
            <IdeaSwipeCard
              key={idea.id}
              idea={idea}
              depth={depth}
              active={depth === 0}
              onApprove={runApprove}
              onReject={(i) => runReject(i.id)}
              onExited={dismiss}
            />
          ))
          // Render bottom-of-stack first so the top card paints last (and on top).
          .reverse()}
      </div>

      <RejectedToggle showRejected={showRejected} setShowRejected={setShowRejected} />
      {showRejected && <RejectedList />}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-[var(--ll-border)] bg-[var(--ll-surface)] p-12 text-center">
      <div
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: "var(--ll-accent-dim)" }}
      >
        <Inbox className="h-5 w-5" style={{ color: "var(--ll-accent)" }} />
      </div>
      <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
        No hay ideas para revisar. Las rutinas cargan nuevas ideas automáticamente, o generalas a demanda.
      </p>
    </div>
  );
}

function RejectedToggle({
  showRejected,
  setShowRejected,
}: {
  showRejected: boolean;
  setShowRejected: (v: boolean) => void;
}) {
  return (
    <div className="flex justify-center">
      <button
        type="button"
        onClick={() => setShowRejected(!showRejected)}
        className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.15em] transition-colors hover:text-[var(--ll-text-muted)]"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
      >
        <EyeOff className="h-3 w-3" />
        {showRejected ? "Ocultar rechazadas" : "Ver rechazadas"}
      </button>
    </div>
  );
}

const ROUTINE_ICONS: Record<RoutineSystem, typeof Brain> = {
  knowledge: Brain,
  news: Newspaper,
  winners: Trophy,
};

function GenerateIdeasMenu() {
  const mut = useMutation({
    mutationFn: (system: RoutineSystem) => triggerContentRoutine(system),
    onSuccess: () =>
      toast.success("Rutina disparada", {
        description: "Las ideas van a aparecer en la bandeja en unos minutos.",
      }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="brand" size="sm" disabled={mut.isPending}>
          {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generar ideas
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-[var(--ll-border)] bg-[var(--ll-surface)]">
        {MANUAL_ROUTINES.map((sys) => {
          const Icon = ROUTINE_ICONS[sys];
          return (
            <DropdownMenuItem
              key={sys}
              disabled={mut.isPending}
              onClick={() => mut.mutate(sys)}
              className="gap-2"
            >
              <Icon className="h-4 w-4" style={{ color: "var(--ll-accent)" }} />
              {ROUTINE_LABELS[sys]}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RejectedList() {
  const { data: rejected, isLoading } = useContentIdeas("rejected");
  if (isLoading) return <Skeleton className="h-24 w-full bg-[var(--ll-surface)]" />;
  if (!rejected || rejected.length === 0) {
    return (
      <p className="text-center text-xs" style={{ color: "var(--ll-text-dim)" }}>
        No hay ideas rechazadas.
      </p>
    );
  }
  return (
    <ul className="mx-auto max-w-lg space-y-1.5">
      {rejected.map((r) => (
        <li
          key={r.id}
          className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] px-3 py-2 text-sm opacity-70"
          style={{ color: "var(--ll-text-muted)" }}
        >
          {r.concept || "Sin concepto"}
        </li>
      ))}
    </ul>
  );
}
