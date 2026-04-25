import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import AssignmentStatusBadge from "@/components/app/AssignmentStatusBadge";
import ScriptStructure from "@/components/app/ScriptStructure";
import BrollList from "@/components/app/BrollList";
import { useAssignment } from "@/hooks/useAssignments";
import { transitionStatus } from "@/lib/api/assignments";
import { createSubmission, fetchSubmissions } from "@/lib/api/submissions";
import { sendNotification } from "@/lib/api/notifications";
import { useSession } from "@/hooks/useSession";
import type { BrollSuggestion } from "@/lib/api/scripts";

export default function AssignmentView() {
  const { id } = useParams();
  const { user } = useSession();
  const qc = useQueryClient();
  const { data: assignment, isLoading } = useAssignment(id);
  const { data: submissions } = useQuery({
    queryKey: ["submissions", id],
    queryFn: () => fetchSubmissions(id!),
    enabled: !!id,
  });

  const [driveUrl, setDriveUrl] = useState("");
  const [notes, setNotes] = useState("");

  function appUrl(path: string) {
    return `${window.location.origin}${path}`;
  }

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user || !id) return;
      await createSubmission({
        assignment_id: id,
        editor_id: user.id,
        drive_url: driveUrl.trim(),
        notes: notes.trim() || null,
      });
      // Move assignment to submitted
      if (assignment?.status !== "submitted") {
        await transitionStatus(id, "submitted");
      }
    },
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ["submissions", id] });
      qc.invalidateQueries({ queryKey: ["assignment", id] });
      qc.invalidateQueries({ queryKey: ["assignments"] });
      toast.success("Submission subida");
      const version = (submissions?.[0]?.version ?? 0) + 1;
      setDriveUrl("");
      setNotes("");
      // Notify admin
      if (assignment?.owner_id) {
        await sendNotification({
          user_id: assignment.owner_id,
          kind: "submission_uploaded",
          title: assignment.title,
          body: notes.trim() || undefined,
          link: appUrl(`/app/admin/assignments/${id}`),
          send_email: true,
          meta: { version },
        });
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const startMutation = useMutation({
    mutationFn: () => transitionStatus(id!, "in_progress"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignment", id] });
      qc.invalidateQueries({ queryKey: ["assignments"] });
      toast.success("Marcado como en curso");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <Skeleton className="h-96 w-full bg-[var(--ll-surface)]" />;
  if (!assignment) {
    return (
      <div className="space-y-4">
        <p style={{ color: "var(--ll-text-muted)" }}>Asignación no encontrada.</p>
        <Button asChild variant="outline">
          <Link to="/app/editor">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
        </Button>
      </div>
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!driveUrl.trim()) {
      toast.error("Pegá el link al drive del video editado");
      return;
    }
    submitMutation.mutate();
  }

  // Linked script (with brolls) — present if assignment has a script_id
  const script = (assignment as unknown as { scripts?: { hook: string | null; development: string | null; cta: string | null; broll_suggestions?: BrollSuggestion[] } }).scripts;
  const brolls = (script?.broll_suggestions ?? []).slice().sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-8">
      <Button asChild variant="ghost" size="sm" className="-ml-3 text-[var(--ll-text-muted)]">
        <Link to="/app/editor">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
      </Button>

      <header className="space-y-3">
        <AssignmentStatusBadge status={assignment.status} />
        <h1
          className="text-2xl md:text-3xl"
          style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
        >
          {assignment.title}
        </h1>
        {assignment.payment_amount && (
          <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
            Pago: <strong style={{ color: "var(--ll-accent)" }}>USD {assignment.payment_amount}</strong>
            {assignment.due_date && (
              <>
                {" · "}
                Plazo: {new Date(assignment.due_date).toLocaleDateString("es-AR")}
              </>
            )}
          </p>
        )}
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        {assignment.raw_drive_url && (
          <a
            href={assignment.raw_drive_url}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4 transition-colors hover:border-[var(--ll-border-hover)]"
          >
            <div
              className="text-[10px] uppercase tracking-[0.15em]"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-muted)" }}
            >
              Drive con crudos
            </div>
            <div className="mt-1 flex items-center gap-1 text-sm" style={{ color: "var(--ll-accent)" }}>
              Abrir <ExternalLink className="h-3 w-3" />
            </div>
          </a>
        )}
        {assignment.brolls_drive_url && (
          <a
            href={assignment.brolls_drive_url}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4 transition-colors hover:border-[var(--ll-border-hover)]"
          >
            <div
              className="text-[10px] uppercase tracking-[0.15em]"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-muted)" }}
            >
              Drive con B-rolls
            </div>
            <div className="mt-1 flex items-center gap-1 text-sm" style={{ color: "var(--ll-accent)" }}>
              Abrir <ExternalLink className="h-3 w-3" />
            </div>
          </a>
        )}
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

      {script && (script.hook || script.development || script.cta) && (
        <section className="space-y-3">
          <h2
            className="text-lg"
            style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}
          >
            Guion de referencia
          </h2>
          <ScriptStructure hook={script.hook} development={script.development} cta={script.cta} />
          {brolls.length > 0 && (
            <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-5">
              <div
                className="mb-2 text-[10px] uppercase tracking-[0.2em]"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-warm)" }}
              >
                B-rolls sugeridos
              </div>
              <BrollList brolls={brolls} />
            </div>
          )}
        </section>
      )}

      {/* Action: start the work */}
      {assignment.status === "open" && (
        <Button onClick={() => startMutation.mutate()} disabled={startMutation.isPending} variant="outline">
          Marcar "en curso"
        </Button>
      )}

      {/* Submission history */}
      {submissions && submissions.length > 0 && (
        <section className="space-y-3">
          <h2
            className="text-lg"
            style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}
          >
            Tus entregas
          </h2>
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
                      Versión {sub.version} · {sub.status}
                    </span>
                    <a
                      href={sub.drive_url}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-2 inline-flex items-center gap-1 text-sm"
                      style={{ color: "var(--ll-accent)" }}
                    >
                      Mi drive <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <span
                    className="text-[10px]"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
                  >
                    {new Date(sub.created_at).toLocaleString("es-AR")}
                  </span>
                </div>
                {sub.corrections.length > 0 && (
                  <ul className="mt-3 space-y-2 border-t border-[var(--ll-border)] pt-3">
                    <li
                      className="text-[10px] uppercase tracking-[0.15em]"
                      style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-muted)" }}
                    >
                      Notas del admin:
                    </li>
                    {sub.corrections.map((c) => (
                      <li
                        key={c.id}
                        className="flex gap-2 text-sm"
                        style={{ color: "var(--ll-text)" }}
                      >
                        <MessageSquare className="mt-0.5 h-3 w-3 shrink-0" style={{ color: "var(--ll-warm)" }} />
                        <span>{c.notes}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Submit form */}
      {assignment.status !== "approved" && assignment.status !== "archived" && (
        <section className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-5">
          <h2
            className="mb-4 text-lg"
            style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}
          >
            Subir nueva versión
          </h2>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="drive-url" style={{ color: "var(--ll-text-muted)" }}>
                Link al drive del video editado *
              </Label>
              <Input
                id="drive-url"
                type="url"
                required
                placeholder="https://drive.google.com/..."
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sub-notes" style={{ color: "var(--ll-text-muted)" }}>
                Notas (opcional)
              </Label>
              <Textarea
                id="sub-notes"
                placeholder="Detalles, decisiones, qué cambiaste vs la versión anterior..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
              />
            </div>
            <Button type="submit" variant="brand" disabled={submitMutation.isPending}>
              <Send className="h-4 w-4" />
              {submitMutation.isPending ? "Subiendo..." : "Mandar para revisión"}
            </Button>
          </form>
        </section>
      )}
    </div>
  );
}
