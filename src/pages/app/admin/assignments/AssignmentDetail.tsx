import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, ExternalLink, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AssignmentStatusBadge from "@/components/app/AssignmentStatusBadge";
import { useAssignment } from "@/hooks/useAssignments";
import {
  deleteAssignment,
  markPaid,
  transitionStatus,
} from "@/lib/api/assignments";
import {
  createCorrection,
  fetchSubmissions,
  setSubmissionStatus,
} from "@/lib/api/submissions";
import { sendNotification } from "@/lib/api/notifications";
import { useSession } from "@/hooks/useSession";

export default function AssignmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: assignment, isLoading } = useAssignment(id);
  const { data: submissions } = useQuery({
    queryKey: ["submissions", id],
    queryFn: () => fetchSubmissions(id!),
    enabled: !!id,
  });

  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionFor, setCorrectionFor] = useState<string | null>(null);
  const [correctionNotes, setCorrectionNotes] = useState("");

  function appUrl(path: string) {
    return `${window.location.origin}${path}`;
  }

  const approveMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      await setSubmissionStatus(submissionId, "approved");
      if (id) await transitionStatus(id, "approved");
    },
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ["submissions", id] });
      qc.invalidateQueries({ queryKey: ["assignment", id] });
      qc.invalidateQueries({ queryKey: ["assignments"] });
      toast.success("Submission aprobada");
      if (assignment?.editor_id) {
        await sendNotification({
          user_id: assignment.editor_id,
          kind: "submission_approved",
          title: assignment.title,
          link: appUrl("/app/editor/earnings"),
          dedupe_key: `submission_approved:${id}`,
          send_email: true,
          meta: assignment.payment_amount ? { payment: `USD ${assignment.payment_amount}` } : undefined,
        });
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const requestCorrectionMutation = useMutation({
    mutationFn: async () => {
      if (!correctionFor || !user || !correctionNotes.trim()) return;
      await createCorrection(correctionFor, user.id, correctionNotes.trim());
      await setSubmissionStatus(correctionFor, "needs_correction");
      if (id) await transitionStatus(id, "needs_correction");
    },
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ["submissions", id] });
      qc.invalidateQueries({ queryKey: ["assignment", id] });
      qc.invalidateQueries({ queryKey: ["assignments"] });
      toast.success("Corrección pedida");
      setCorrectionOpen(false);
      const notes = correctionNotes.trim();
      setCorrectionNotes("");
      if (assignment?.editor_id) {
        await sendNotification({
          user_id: assignment.editor_id,
          kind: "correction_requested",
          title: assignment.title,
          body: notes,
          link: appUrl(`/app/editor/${id}`),
          send_email: true,
        });
      }
      setCorrectionFor(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const markPaidMutation = useMutation({
    mutationFn: () => markPaid(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignment", id] });
      qc.invalidateQueries({ queryKey: ["assignments"] });
      toast.success("Pago registrado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAssignment(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments"] });
      toast.success("Asignación eliminada");
      navigate("/app/admin/assignments", { replace: true });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <Skeleton className="h-96 w-full bg-[var(--ll-surface)]" />;
  if (!assignment) {
    return (
      <div className="space-y-4">
        <p style={{ color: "var(--ll-text-muted)" }}>Asignación no encontrada.</p>
        <Button asChild variant="outline">
          <Link to="/app/admin/assignments">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="-ml-3 text-[var(--ll-text-muted)]">
          <Link to="/app/admin/assignments">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (confirm("¿Eliminar esta asignación?")) deleteMutation.mutate();
          }}
          disabled={deleteMutation.isPending}
          className="text-[var(--ll-text-muted)] hover:text-red-400"
        >
          <Trash2 className="h-4 w-4" /> Eliminar
        </Button>
      </div>

      <header className="space-y-3">
        <div className="flex items-center gap-2">
          <AssignmentStatusBadge status={assignment.status} />
          {assignment.payment_status === "paid" ? (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-[var(--ll-accent)]/40 bg-[var(--ll-accent)]/15 px-2.5 py-0.5 text-xs"
              style={{ color: "var(--ll-accent)" }}
            >
              <Check className="h-3 w-3" /> Pagado
            </span>
          ) : (
            assignment.payment_amount && (
              <span className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
                Pago pendiente: USD {assignment.payment_amount}
              </span>
            )
          )}
        </div>
        <h1
          className="text-2xl md:text-3xl"
          style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
        >
          {assignment.title}
        </h1>
        {assignment.editor_profile?.email && (
          <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
            Editor: <strong style={{ color: "var(--ll-text)" }}>{assignment.editor_profile.email}</strong>
          </p>
        )}
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        <Info label="Drive crudos" value={assignment.raw_drive_url} link />
        <Info label="Drive B-rolls" value={assignment.brolls_drive_url} link />
        <Info
          label="Fecha límite"
          value={assignment.due_date ? new Date(assignment.due_date).toLocaleDateString("es-AR") : null}
        />
        <Info
          label="Pago"
          value={assignment.payment_amount ? `USD ${assignment.payment_amount}` : null}
        />
      </section>

      {assignment.instructions && (
        <section className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-5">
          <div
            className="mb-2 text-[10px] uppercase tracking-[0.2em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-muted)" }}
          >
            Instrucciones
          </div>
          <p className="whitespace-pre-wrap text-sm" style={{ color: "var(--ll-text)" }}>
            {assignment.instructions}
          </p>
        </section>
      )}

      <section className="space-y-3">
        <h2
          className="text-lg"
          style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}
        >
          Submissions
        </h2>
        {!submissions || submissions.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
            El editor todavía no subió nada.
          </p>
        ) : (
          <ul className="space-y-3">
            {submissions.map((sub) => (
              <li
                key={sub.id}
                className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span
                      className="text-[10px] uppercase tracking-[0.15em]"
                      style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-warm)" }}
                    >
                      Versión {sub.version}
                    </span>
                    <a
                      href={sub.drive_url}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-2 inline-flex items-center gap-1 text-sm"
                      style={{ color: "var(--ll-accent)" }}
                    >
                      Abrir drive <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <span
                    className="text-[10px] uppercase tracking-[0.15em]"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      color: "var(--ll-text-dim)",
                    }}
                  >
                    {new Date(sub.created_at).toLocaleString("es-AR")}
                  </span>
                </div>
                {sub.notes && (
                  <p className="mt-2 whitespace-pre-wrap text-sm" style={{ color: "var(--ll-text-muted)" }}>
                    {sub.notes}
                  </p>
                )}
                {sub.corrections.length > 0 && (
                  <ul className="mt-3 space-y-2 border-t border-[var(--ll-border)] pt-3">
                    {sub.corrections.map((c) => (
                      <li key={c.id} className="flex gap-2 text-xs" style={{ color: "var(--ll-text-muted)" }}>
                        <MessageSquare className="h-3 w-3 shrink-0" style={{ color: "var(--ll-warm)" }} />
                        <span>{c.notes}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {sub.status === "pending_review" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="brand"
                      size="sm"
                      onClick={() => approveMutation.mutate(sub.id)}
                      disabled={approveMutation.isPending}
                    >
                      <Check className="h-4 w-4" /> Aprobar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCorrectionFor(sub.id);
                        setCorrectionOpen(true);
                      }}
                    >
                      <MessageSquare className="h-4 w-4" /> Pedir corrección
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {assignment.status === "approved" && assignment.payment_status !== "paid" && (
        <section className="rounded-lg border border-[var(--ll-accent)]/40 bg-[var(--ll-accent)]/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p style={{ color: "var(--ll-text)" }}>
                ¿Ya pagaste el trabajo del editor?
              </p>
              <p className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
                Marcalo como pagado para que el editor lo vea en sus Ganancias.
              </p>
            </div>
            <Button
              variant="brand"
              onClick={() => markPaidMutation.mutate()}
              disabled={markPaidMutation.isPending}
            >
              <Check className="h-4 w-4" /> Marcar como pagado
            </Button>
          </div>
        </section>
      )}

      {/* Correction dialog */}
      <Dialog open={correctionOpen} onOpenChange={setCorrectionOpen}>
        <DialogContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Instrument Serif', serif" }}>Pedir corrección</DialogTitle>
            <DialogDescription style={{ color: "var(--ll-text-muted)" }}>
              El editor recibe estas notas por mail. Sé específico.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            autoFocus
            placeholder="A los 12s falta el b-roll del producto. El cierre es muy largo..."
            value={correctionNotes}
            onChange={(e) => setCorrectionNotes(e.target.value)}
            rows={6}
            className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCorrectionOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="brand"
              onClick={() => requestCorrectionMutation.mutate()}
              disabled={requestCorrectionMutation.isPending || !correctionNotes.trim()}
            >
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value, link }: { label: string; value: string | null | undefined; link?: boolean }) {
  return (
    <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4">
      <div
        className="text-[10px] uppercase tracking-[0.15em]"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-muted)" }}
      >
        {label}
      </div>
      <div className="mt-1 text-sm break-all" style={{ color: "var(--ll-text)" }}>
        {value ? (
          link ? (
            <a href={value} target="_blank" rel="noreferrer" style={{ color: "var(--ll-accent)" }}>
              {value} <ExternalLink className="inline h-3 w-3" />
            </a>
          ) : (
            value
          )
        ) : (
          <span style={{ color: "var(--ll-text-dim)" }}>—</span>
        )}
      </div>
    </div>
  );
}
