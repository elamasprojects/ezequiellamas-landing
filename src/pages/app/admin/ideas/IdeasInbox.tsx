import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, CheckCircle2, Plus, Sparkles, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useScripts } from "@/hooks/useScripts";
import type { ScriptStatus, Script } from "@/lib/api/scripts";
import {
  fetchAdminScriptApprovals,
  type ScriptApproval,
} from "@/lib/api/scriptApprovals";
import { usePendingContentIdeasCount } from "@/hooks/useContentIdeas";
import IdeaReviewQueue from "./IdeaReviewQueue";

const TABS: { value: ScriptStatus; label: string }[] = [
  { value: "draft", label: "Drafts" },
  { value: "scheduled", label: "Agendados" },
  { value: "recorded", label: "Grabados" },
  { value: "posted", label: "Posteados" },
  { value: "archived", label: "Archivados" },
];

export default function IdeasInbox() {
  const [view, setView] = useState<"bandeja" | "guiones">("bandeja");
  const [tab, setTab] = useState<ScriptStatus>("draft");
  const pendingIdeas = usePendingContentIdeasCount();
  const { data: scripts, isLoading } = useScripts({ status: tab });
  const { data: approvals } = useQuery({
    queryKey: ["script_approvals_admin"],
    queryFn: fetchAdminScriptApprovals,
    staleTime: 30_000,
  });

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
          >
            Ideas → Guion
          </div>
          <h1
            className="text-3xl"
            style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
          >
            Tus <em style={{ color: "var(--ll-warm)" }}>ideas</em>
          </h1>
          <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
            Revisá las ideas que generan tus rutinas (deslizá para aprobar o descartar), o cargá una manual. Al aprobar, la IA te arma el guion en tu tono.
          </p>
        </div>
        <Button asChild variant="brand">
          <Link to="/app/admin/ideas/new">
            <Plus className="h-4 w-4" /> Nueva idea
          </Link>
        </Button>
      </header>

      <Tabs value={view} onValueChange={(v) => setView(v as "bandeja" | "guiones")}>
        <TabsList className="bg-[var(--ll-surface)] border border-[var(--ll-border)]">
          <TabsTrigger value="bandeja" className="data-[state=active]:bg-[var(--ll-surface-2)]">
            Bandeja
            {pendingIdeas > 0 && (
              <span
                className="ml-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                style={{ background: "var(--ll-accent)", color: "#0a0a0a" }}
              >
                {pendingIdeas}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="guiones" className="data-[state=active]:bg-[var(--ll-surface-2)]">
            Guiones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bandeja" className="mt-6">
          <IdeaReviewQueue />
        </TabsContent>

        <TabsContent value="guiones" className="mt-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as ScriptStatus)}>
            <TabsList className="bg-[var(--ll-surface)] border border-[var(--ll-border)]">
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value} className="data-[state=active]:bg-[var(--ll-surface-2)]">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {TABS.map((t) => (
              <TabsContent key={t.value} value={t.value} className="mt-6">
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-20 w-full bg-[var(--ll-surface)]" />
                    <Skeleton className="h-20 w-full bg-[var(--ll-surface)]" />
                    <Skeleton className="h-20 w-full bg-[var(--ll-surface)]" />
                  </div>
                ) : !scripts || scripts.length === 0 ? (
                  <EmptyState status={t.value} />
                ) : (
                  <ul className="space-y-2">
                    {scripts.map((s) => (
                      <ScriptRow
                        key={s.id}
                        script={s}
                        approval={approvals?.get(s.id)}
                      />
                    ))}
                  </ul>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const BUCKET_CHIP_LABELS: Record<string, string> = {
  negocios: "Negocios",
  sistemas: "Sistemas",
  ia_estrategica: "IA",
  finanzas: "Finanzas",
  mentalidad: "Mentalidad",
};

const AVATAR_CHIP_LABELS: Record<string, string> = {
  newbie: "Newbie",
  owner: "Owner",
  developer: "Developer",
};

function ScriptRow({
  script,
  approval,
}: {
  script: Script;
  approval: ScriptApproval | undefined;
}) {
  return (
    <li>
      <Link
        to={`/app/admin/ideas/${script.id}`}
        className="block rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4 transition-colors hover:border-[var(--ll-border-hover)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium truncate" style={{ color: "var(--ll-text)" }}>
              {script.title || "Sin título"}
            </h3>
            {script.hook && (
              <p
                className="mt-1 line-clamp-2 text-sm"
                style={{ color: "var(--ll-text-muted)" }}
              >
                {script.hook}
              </p>
            )}
            {(script.content_bucket || script.avatar_target || script.referent_video_id) && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {script.referent_video_id && (
                  <span
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--ll-accent)]/40 bg-[var(--ll-accent)]/10 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em]"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
                    title="Adaptado de un viral del banco de referentes"
                  >
                    <Sparkles className="h-2.5 w-2.5" />
                    Adaptado
                  </span>
                )}
                {script.content_bucket && (
                  <span
                    className="rounded-md border border-[var(--ll-border)] bg-[var(--ll-surface-2)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em]"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
                  >
                    {BUCKET_CHIP_LABELS[script.content_bucket] ?? script.content_bucket}
                  </span>
                )}
                {script.avatar_target && (
                  <span
                    className="rounded-md border border-[var(--ll-border)] bg-[var(--ll-surface-2)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em]"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-muted)" }}
                  >
                    {AVATAR_CHIP_LABELS[script.avatar_target] ?? script.avatar_target}
                  </span>
                )}
              </div>
            )}
            {approval && <ApprovalNote approval={approval} />}
          </div>
          <div className="text-right">
            {approval && <ApprovalBadge approval={approval} />}
            {script.scheduled_at && (
              <div
                className="mt-1 flex items-center justify-end gap-1 text-xs"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
              >
                <Calendar className="h-3 w-3" />
                {new Date(script.scheduled_at).toLocaleDateString("es-AR", {
                  day: "2-digit",
                  month: "short",
                })}
              </div>
            )}
            <div
              className="mt-1 text-[10px] uppercase tracking-[0.15em]"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
            >
              {new Date(script.created_at).toLocaleDateString("es-AR")}
            </div>
          </div>
        </div>
      </Link>
    </li>
  );
}

function ApprovalBadge({ approval }: { approval: ScriptApproval }) {
  const isApproved = approval.decision === "approved";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] ${
        isApproved
          ? "border-[var(--ll-accent)]/40 bg-[var(--ll-accent)]/15"
          : "border-red-500/40 bg-red-500/15"
      }`}
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        color: isApproved ? "var(--ll-accent)" : "rgb(248 113 113)",
      }}
    >
      {isApproved ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <XCircle className="h-3 w-3" />
      )}
      {isApproved ? "Aprobado" : "Rechazado"}
    </span>
  );
}

function ApprovalNote({ approval }: { approval: ScriptApproval }) {
  if (!approval.notes) return null;
  const isApproved = approval.decision === "approved";
  return (
    <div
      className={`mt-2 rounded-md border px-2 py-1.5 text-xs ${
        isApproved
          ? "border-[var(--ll-accent)]/30 bg-[var(--ll-accent)]/5"
          : "border-red-500/30 bg-red-950/20"
      }`}
    >
      <div
        className="text-[9px] uppercase tracking-[0.15em]"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          color: isApproved ? "var(--ll-accent)" : "rgb(248 113 113)",
        }}
      >
        Nota del asesor
      </div>
      <p
        className="mt-0.5 line-clamp-2"
        style={{ color: "var(--ll-text-muted)" }}
      >
        {approval.notes}
      </p>
    </div>
  );
}

function EmptyState({ status }: { status: ScriptStatus }) {
  const messages: Record<ScriptStatus, string> = {
    draft: "Todavía no escribiste ninguna idea. Tirale.",
    scheduled: "No hay guiones agendados.",
    recorded: "No hay guiones grabados pendientes de postear.",
    posted: "Cuando postees un video, va a aparecer acá.",
    archived: "El archivo está vacío.",
  };
  return (
    <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-12 text-center">
      <div
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: "var(--ll-accent-dim)" }}
      >
        <Sparkles className="h-5 w-5" style={{ color: "var(--ll-accent)" }} />
      </div>
      <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
        {messages[status]}
      </p>
      {status === "draft" && (
        <Button asChild variant="brand" className="mt-4">
          <Link to="/app/admin/ideas/new">
            <Plus className="h-4 w-4" /> Nueva idea
          </Link>
        </Button>
      )}
    </div>
  );
}
