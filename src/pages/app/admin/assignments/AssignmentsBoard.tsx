import { Link } from "react-router-dom";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAssignments } from "@/hooks/useAssignments";
import {
  KANBAN_COLUMNS,
  STATUS_LABEL,
  type AssignmentStatus,
  type AssignmentWithLinks,
} from "@/lib/api/assignments";

export default function AssignmentsBoard() {
  const { data: assignments, isLoading } = useAssignments();

  const grouped = new Map<AssignmentStatus, AssignmentWithLinks[]>();
  for (const col of KANBAN_COLUMNS) grouped.set(col, []);
  (assignments ?? []).forEach((a) => {
    const s = a.status as AssignmentStatus;
    if (s === "in_review") {
      grouped.get("submitted")?.push(a);
    } else if (grouped.has(s)) {
      grouped.get(s)!.push(a);
    }
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
          >
            Asignaciones
          </div>
          <h1
            className="text-2xl md:text-3xl"
            style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
          >
            Trabajo del <em style={{ color: "var(--ll-warm)" }}>editor</em>
          </h1>
          <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
            Cada tarjeta es un video que tu editor está editando. El editor recibe mail al asignar y al pedir
            correcciones.
          </p>
        </div>
        <Button asChild variant="brand" className="self-start sm:self-auto">
          <Link to="/app/admin/assignments/new">
            <Plus className="h-4 w-4" /> Nueva asignación
          </Link>
        </Button>
      </header>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-64 bg-[var(--ll-surface)]" />
          ))}
        </div>
      ) : !assignments || assignments.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="-mx-1 grid gap-3 overflow-x-auto px-1 md:grid-cols-3 lg:grid-cols-5">
          {KANBAN_COLUMNS.map((col) => (
            <div
              key={col}
              className="flex min-h-64 flex-col gap-2 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-3"
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-[10px] uppercase tracking-[0.15em]"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-muted)" }}
                >
                  {STATUS_LABEL[col]}
                </span>
                <span
                  className="text-xs"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
                >
                  {(grouped.get(col) ?? []).length}
                </span>
              </div>
              <div className="flex-1 space-y-2">
                {(grouped.get(col) ?? []).map((a) => (
                  <AssignmentCard key={a.id} assignment={a} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AssignmentCard({ assignment }: { assignment: AssignmentWithLinks }) {
  const due = assignment.due_date ? new Date(assignment.due_date).toLocaleDateString("es-AR") : null;
  return (
    <Link
      to={`/app/admin/assignments/${assignment.id}`}
      className="block rounded-md border border-[var(--ll-border)] bg-[var(--ll-bg)] p-2.5 transition-colors hover:border-[var(--ll-border-hover)]"
    >
      <h3 className="line-clamp-2 text-sm font-medium" style={{ color: "var(--ll-text)" }}>
        {assignment.title}
      </h3>
      <div
        className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-muted)" }}
      >
        {assignment.editor_profile?.email && (
          <span className="truncate max-w-[140px]">{assignment.editor_profile.email}</span>
        )}
        {due && (
          <span style={{ color: "var(--ll-text-dim)" }}>
            · {due}
          </span>
        )}
        {assignment.payment_amount && (
          <span style={{ color: "var(--ll-accent)" }}>
            · ${assignment.payment_amount}
          </span>
        )}
      </div>
    </Link>
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
        Sin asignaciones todavía
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--ll-text-muted)" }}>
        Cuando le pasés un guion a tu editor con el drive de los crudos, va a aparecer acá. Recibe mail
        automáticamente.
      </p>
      <Button asChild variant="brand" className="mt-6">
        <Link to="/app/admin/assignments/new">
          <Plus className="h-4 w-4" /> Crear asignación
        </Link>
      </Button>
    </div>
  );
}
