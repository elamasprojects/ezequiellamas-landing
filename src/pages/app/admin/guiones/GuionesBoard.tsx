import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Lightbulb, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import LengthSwitch from "@/components/app/LengthSwitch";
import Kanban, { type KanbanColumn } from "@/components/app/Kanban";
import { useScripts } from "@/hooks/useScripts";
import { useKanbanMove } from "@/hooks/useKanbanMove";
import { useYoutubeProjects } from "@/hooks/useYoutubeStudio";
import {
  updateScriptStatus,
  SCRIPT_STATUSES,
  SCRIPT_STATUS_LABELS,
  CONTENT_BUCKET_LABELS,
  type Script,
  type ScriptStatus,
} from "@/lib/api/scripts";
import { updateYoutubeProject, type YoutubeProject } from "@/lib/api/youtubeStudio";
import {
  fetchAdminScriptApprovals,
  type ScriptApproval,
} from "@/lib/api/scriptApprovals";
import type { ContentLength } from "@/lib/api/contentIdeas";

// ── Corto: editorial lifecycle of the `scripts` table. Columns derive from the
// shared SCRIPT_STATUSES/labels so the board, editor and API stay in sync; only
// the per-column accent is board-specific.
const SCRIPT_ACCENTS: Record<ScriptStatus, string> = {
  draft: "var(--ll-text-dim)",
  scheduled: "#60a5fa",
  recorded: "#c084fc",
  posted: "var(--ll-accent)",
  archived: "#6b7280",
};
const SCRIPT_COLUMNS: KanbanColumn[] = SCRIPT_STATUSES.map((s) => ({
  id: s,
  label: SCRIPT_STATUS_LABELS[s],
  accent: SCRIPT_ACCENTS[s],
}));

// ── Largo: own editorial lifecycle of YouTube projects, tracked in the
// dedicated `content_status` column (separate from `status`, which is the
// generation-pipeline state). `idea` is the fallback for any unknown value.
const YT_COLUMNS: KanbanColumn[] = [
  { id: "idea", label: "Idea", accent: "var(--ll-text-dim)" },
  { id: "structured", label: "Estructurado", accent: "#60a5fa" },
  { id: "producing", label: "En producción", accent: "#c084fc" },
  { id: "published", label: "Publicado", accent: "var(--ll-accent)" },
  { id: "archived", label: "Archivado", accent: "#6b7280" },
];
const YT_COLUMN_IDS = new Set(YT_COLUMNS.map((c) => c.id));
const ytColumnOf = (p: YoutubeProject) =>
  YT_COLUMN_IDS.has(p.content_status) ? p.content_status : "idea";

const SCRIPTS_KEY = ["scripts", { status: null, statuses: null, contentLength: "corto" }] as const;

export default function GuionesBoard() {
  const [length, setLength] = useState<ContentLength>("corto");
  const { data: scripts, isLoading: loadingScripts } = useScripts({ contentLength: "corto" });
  const { data: projects, isLoading: loadingProjects } = useYoutubeProjects();

  const counts: Record<ContentLength, number> = {
    corto: scripts?.length ?? 0,
    largo: projects?.length ?? 0,
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <div
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
          >
            Guiones
          </div>
          <h1
            className="text-3xl"
            style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
          >
            Tablero de <em style={{ color: "var(--ll-warm)" }}>guiones</em>
          </h1>
          <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
            Arrastrá cada guion entre estados. Tocá uno para abrir el detalle.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/app/admin/ideas">
            <Lightbulb className="h-4 w-4" /> Bandeja de ideas
          </Link>
        </Button>
      </header>

      <LengthSwitch value={length} onChange={setLength} counts={counts} />

      {length === "corto" ? (
        loadingScripts ? (
          <BoardSkeleton />
        ) : (
          <ShortBoard scripts={scripts ?? []} />
        )
      ) : loadingProjects ? (
        <BoardSkeleton />
      ) : (
        <LongBoard projects={projects ?? []} />
      )}
    </div>
  );
}

function ShortBoard({ scripts }: { scripts: Script[] }) {
  const navigate = useNavigate();
  const { data: approvals } = useQuery({
    queryKey: ["script_approvals_admin"],
    queryFn: fetchAdminScriptApprovals,
    staleTime: 30_000,
  });

  const move = useKanbanMove<Script>({
    queryKey: SCRIPTS_KEY,
    apply: (id, status) => updateScriptStatus(id, status as ScriptStatus),
    patch: (s, status) => ({ ...s, status: status as ScriptStatus }),
    errorMessage: "No se pudo mover el guion",
  });

  const items = useMemo(
    () => scripts.map((s) => ({ ...s, column: s.status })),
    [scripts],
  );

  return (
    <Kanban
      columns={SCRIPT_COLUMNS}
      items={items}
      emptyLabel="Sin guiones"
      onMove={(item, toColumn) =>
        move.mutate({ id: item.id, status: toColumn as ScriptStatus })
      }
      renderCard={(s) => (
        <ScriptCard
          script={s}
          approval={approvals?.get(s.id)}
          onOpen={() => navigate(`/app/admin/guiones/${s.id}`)}
        />
      )}
    />
  );
}

function LongBoard({ projects }: { projects: YoutubeProject[] }) {
  const navigate = useNavigate();

  const move = useKanbanMove<YoutubeProject>({
    queryKey: ["youtube-projects"],
    apply: (id, status) => updateYoutubeProject(id, { content_status: status }),
    patch: (p, status) => ({ ...p, content_status: status }),
    errorMessage: "No se pudo mover el proyecto",
  });

  const items = useMemo(
    () => projects.map((p) => ({ ...p, column: ytColumnOf(p) })),
    [projects],
  );

  return (
    <Kanban
      columns={YT_COLUMNS}
      items={items}
      emptyLabel="Sin proyectos"
      onMove={(item, toColumn) => move.mutate({ id: item.id, status: toColumn })}
      renderCard={(p) => (
        <ProjectCard
          project={p}
          onOpen={() => navigate(`/app/admin/studio/${p.id}`)}
        />
      )}
    />
  );
}

function CardShell({
  onOpen,
  children,
}: {
  onOpen: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={onOpen}
      className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface-2)] p-3 transition-colors hover:border-[var(--ll-border-hover)]"
    >
      {children}
    </div>
  );
}

function ScriptCard({
  script,
  approval,
  onOpen,
}: {
  script: Script;
  approval: ScriptApproval | undefined;
  onOpen: () => void;
}) {
  return (
    <CardShell onOpen={onOpen}>
      <h3 className="line-clamp-2 text-sm font-medium" style={{ color: "var(--ll-text)" }}>
        {script.title || "Sin título"}
      </h3>
      {script.hook && (
        <p className="mt-1 line-clamp-2 text-xs" style={{ color: "var(--ll-text-muted)" }}>
          {script.hook}
        </p>
      )}
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
            className="rounded-md border border-[var(--ll-border)] bg-[var(--ll-surface)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
          >
            {CONTENT_BUCKET_LABELS[script.content_bucket] ?? script.content_bucket}
          </span>
        )}
        {approval && (
          <span
            className={`rounded-md border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] ${
              approval.decision === "approved"
                ? "border-[var(--ll-accent)]/40 bg-[var(--ll-accent)]/15"
                : "border-red-500/40 bg-red-500/15"
            }`}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: approval.decision === "approved" ? "var(--ll-accent)" : "rgb(248 113 113)",
            }}
          >
            {approval.decision === "approved" ? "Aprobado" : "Rechazado"}
          </span>
        )}
      </div>
      {approval?.notes && (
        <p
          className="mt-1.5 line-clamp-2 text-[11px] italic"
          style={{
            color: approval.decision === "rejected" ? "rgb(248 113 113)" : "var(--ll-text-dim)",
          }}
          title={approval.notes}
        >
          {approval.notes}
        </p>
      )}
      {script.scheduled_at && (
        <div
          className="mt-2 flex items-center gap-1 text-[10px]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
        >
          <Calendar className="h-3 w-3" />
          {new Date(script.scheduled_at).toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "short",
          })}
        </div>
      )}
    </CardShell>
  );
}

function ProjectCard({
  project,
  onOpen,
}: {
  project: YoutubeProject;
  onOpen: () => void;
}) {
  return (
    <CardShell onOpen={onOpen}>
      <h3 className="line-clamp-2 text-sm font-medium" style={{ color: "var(--ll-text)" }}>
        {project.title || project.chosen_title || project.idea || "Sin título"}
      </h3>
      {project.idea && (project.title || project.chosen_title) && (
        <p className="mt-1 line-clamp-2 text-xs" style={{ color: "var(--ll-text-muted)" }}>
          {project.idea}
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className="rounded-md border border-[var(--ll-border)] bg-[var(--ll-surface)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-muted)" }}
        >
          {project.length_tier}
        </span>
      </div>
    </CardShell>
  );
}

function BoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="w-72 shrink-0 space-y-2">
          <Skeleton className="h-4 w-24 bg-[var(--ll-surface)]" />
          <Skeleton className="h-32 w-full rounded-xl bg-[var(--ll-surface)]" />
        </div>
      ))}
    </div>
  );
}
