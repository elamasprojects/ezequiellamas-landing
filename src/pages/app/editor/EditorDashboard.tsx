import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import AssignmentStatusBadge from "@/components/app/AssignmentStatusBadge";
import { useAssignments } from "@/hooks/useAssignments";

export default function EditorDashboard() {
  const { data: assignments, isLoading } = useAssignments();

  const open = (assignments ?? []).filter(
    (a) => a.status === "open" || a.status === "in_progress" || a.status === "needs_correction",
  );
  const pendingPayment = (assignments ?? []).filter(
    (a) => a.status === "approved" && a.payment_status === "pending",
  );
  const pendingTotal = pendingPayment.reduce((sum, a) => sum + (Number(a.payment_amount) || 0), 0);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div
          className="text-[10px] uppercase tracking-[0.25em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
        >
          Editor
        </div>
        <h1
          className="text-2xl md:text-3xl"
          style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
        >
          Tu <em style={{ color: "var(--ll-warm)" }}>cola</em> de trabajo
        </h1>
      </header>

      {pendingTotal > 0 && (
        <div className="rounded-lg border border-[var(--ll-accent)]/40 bg-[var(--ll-accent)]/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p
                className="text-[10px] uppercase tracking-[0.15em]"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
              >
                Pago pendiente
              </p>
              <p
                className="text-3xl"
                style={{ fontFamily: "'Instrument Serif', serif", color: "var(--ll-text)" }}
              >
                USD {pendingTotal.toFixed(2)}
              </p>
            </div>
            <Link to="/app/editor/earnings" className="text-sm" style={{ color: "var(--ll-accent)" }}>
              Ver detalle →
            </Link>
          </div>
        </div>
      )}

      <section className="space-y-3">
        <h2
          className="text-lg"
          style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}
        >
          Asignaciones abiertas ({open.length})
        </h2>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full bg-[var(--ll-surface)]" />
            <Skeleton className="h-20 w-full bg-[var(--ll-surface)]" />
          </div>
        ) : open.length === 0 ? (
          <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-12 text-center">
            <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
              No tenés asignaciones abiertas.
            </p>
            <p className="mt-2 text-xs" style={{ color: "var(--ll-text-dim)" }}>
              Cuando el admin te asigne un video, recibís un mail y aparece acá.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {open.map((a) => (
              <li key={a.id}>
                <Link
                  to={`/app/editor/${a.id}`}
                  className="block rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4 transition-colors hover:border-[var(--ll-border-hover)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-medium" style={{ color: "var(--ll-text)" }}>
                        {a.title}
                      </h3>
                      <div
                        className="mt-1.5 flex flex-wrap items-center gap-2 text-xs"
                        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-muted)" }}
                      >
                        {a.due_date && <span>Plazo: {new Date(a.due_date).toLocaleDateString("es-AR")}</span>}
                        {a.payment_amount && (
                          <span style={{ color: "var(--ll-accent)" }}>USD {a.payment_amount}</span>
                        )}
                      </div>
                    </div>
                    <AssignmentStatusBadge status={a.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
