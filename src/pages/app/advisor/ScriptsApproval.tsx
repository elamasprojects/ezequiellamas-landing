import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  FileCheck,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSession } from "@/hooks/useSession";
import { useAssignedAdmins } from "@/hooks/useAssignedAdmins";
import { fetchScripts, type Script } from "@/lib/api/scripts";
import {
  fetchAdvisorDecisions,
  submitScriptDecision,
  type ApprovalDecision,
  type ScriptApproval,
} from "@/lib/api/scriptApprovals";
import { sendNotification } from "@/lib/api/notifications";

type TabValue = "pendientes" | "aprobados" | "rechazados";

const TABS: { value: TabValue; label: string }[] = [
  { value: "pendientes", label: "Pendientes" },
  { value: "aprobados", label: "Aprobados" },
  { value: "rechazados", label: "Rechazados" },
];

interface DecisionDialogState {
  script: Script;
  action: ApprovalDecision;
}

export default function ScriptsApproval() {
  const { user } = useSession();
  const { data: admins } = useAssignedAdmins();
  const [tab, setTab] = useState<TabValue>("pendientes");
  const [dialog, setDialog] = useState<DecisionDialogState | null>(null);

  const queryClient = useQueryClient();

  const { data: scripts, isLoading: scriptsLoading } = useQuery({
    queryKey: ["advisor_scripts"],
    queryFn: () => fetchScripts(),
    staleTime: 30_000,
  });

  const { data: decisions, isLoading: decisionsLoading } = useQuery({
    queryKey: ["advisor_decisions", user?.id],
    queryFn: () => fetchAdvisorDecisions(),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const decisionsByScriptId = useMemo(() => {
    const m = new Map<string, ScriptApproval>();
    for (const d of decisions ?? []) m.set(d.script_id, d);
    return m;
  }, [decisions]);

  const adminsByOwnerId = useMemo(() => {
    const m = new Map<string, { name: string; email: string }>();
    for (const a of admins ?? []) {
      m.set(a.admin_id, { name: a.full_name ?? a.email, email: a.email });
    }
    return m;
  }, [admins]);

  const filtered = useMemo(() => {
    const all = scripts ?? [];
    if (tab === "pendientes") {
      return all.filter(
        (s) => s.status === "draft" && !decisionsByScriptId.has(s.id),
      );
    }
    const target: ApprovalDecision = tab === "aprobados" ? "approved" : "rejected";
    return all.filter((s) => decisionsByScriptId.get(s.id)?.decision === target);
  }, [scripts, decisionsByScriptId, tab]);

  const isLoading = scriptsLoading || decisionsLoading;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div
          className="text-[10px] uppercase tracking-[0.25em]"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            color: "var(--ll-accent)",
          }}
        >
          Asesor
        </div>
        <h1
          className="text-2xl md:text-3xl"
          style={{
            fontFamily: "'Instrument Serif', serif",
            letterSpacing: "-0.025em",
            lineHeight: 1.1,
          }}
        >
          Guiones para <em style={{ color: "var(--ll-warm)" }}>aprobar</em>
        </h1>
        {admins && admins.length > 0 && (
          <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
            Revisás drafts de:{" "}
            {admins.map((a, i) => (
              <span key={a.admin_id}>
                <strong style={{ color: "var(--ll-text)" }}>
                  {a.full_name || a.email}
                </strong>
                {i < admins.length - 1 && ", "}
              </span>
            ))}
          </p>
        )}
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList className="border border-[var(--ll-border)] bg-[var(--ll-surface)]">
          {TABS.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="data-[state=active]:bg-[var(--ll-surface-2)]"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-6">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-24 w-full bg-[var(--ll-surface)]" />
                <Skeleton className="h-24 w-full bg-[var(--ll-surface)]" />
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState tab={t.value} />
            ) : (
              <ul className="space-y-2">
                {filtered.map((s) => (
                  <ScriptApprovalRow
                    key={s.id}
                    script={s}
                    decision={decisionsByScriptId.get(s.id)}
                    admin={adminsByOwnerId.get(s.owner_id)}
                    onApprove={() => setDialog({ script: s, action: "approved" })}
                    onReject={() => setDialog({ script: s, action: "rejected" })}
                  />
                ))}
              </ul>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {dialog && user && (
        <DecisionDialog
          script={dialog.script}
          action={dialog.action}
          advisorId={user.id}
          onClose={() => setDialog(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["advisor_decisions"] });
            queryClient.invalidateQueries({ queryKey: ["script_approvals_admin"] });
            setDialog(null);
            toast.success(
              dialog.action === "approved" ? "Guion aprobado" : "Guion rechazado",
            );
            // Mover al tab apropiado para que el usuario vea la decisión persistida
            setTab(dialog.action === "approved" ? "aprobados" : "rechazados");
          }}
        />
      )}
    </div>
  );
}

function ScriptApprovalRow({
  script,
  decision,
  admin,
  onApprove,
  onReject,
}: {
  script: Script;
  decision: ScriptApproval | undefined;
  admin: { name: string; email: string } | undefined;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <li className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4">
      <div className="space-y-3">
        <div>
          <h3
            className="font-medium"
            style={{ color: "var(--ll-text)" }}
          >
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
          <div
            className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: "var(--ll-text-dim)",
            }}
          >
            {admin && <span>de {admin.name}</span>}
            <span>{new Date(script.created_at).toLocaleDateString("es-AR")}</span>
            {script.content_bucket && (
              <span style={{ color: "var(--ll-accent)" }}>
                {script.content_bucket}
              </span>
            )}
            {script.avatar_target && <span>{script.avatar_target}</span>}
          </div>
        </div>

        {script.development && (
          <p
            className="line-clamp-3 text-sm"
            style={{ color: "var(--ll-text-muted)" }}
          >
            {script.development}
          </p>
        )}

        {decision && (
          <div
            className={`rounded-md border p-3 text-sm ${
              decision.decision === "approved"
                ? "border-[var(--ll-accent)]/40 bg-[var(--ll-accent)]/10"
                : "border-red-500/40 bg-red-950/20"
            }`}
          >
            <div
              className="flex items-center gap-2 text-xs uppercase tracking-[0.15em]"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                color:
                  decision.decision === "approved"
                    ? "var(--ll-accent)"
                    : "rgb(248 113 113)",
              }}
            >
              {decision.decision === "approved" ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              {decision.decision === "approved" ? "Aprobado" : "Rechazado"}
              <span
                className="ml-2 normal-case tracking-normal"
                style={{ color: "var(--ll-text-dim)" }}
              >
                {new Date(decision.updated_at).toLocaleDateString("es-AR")}
              </span>
            </div>
            {decision.notes && (
              <p
                className="mt-2"
                style={{ color: "var(--ll-text-muted)" }}
              >
                {decision.notes}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          {decision?.decision === "rejected" ? (
            <Button onClick={onApprove} variant="brand" size="sm">
              <CheckCircle2 className="h-4 w-4" /> Aprobar igual
            </Button>
          ) : decision?.decision === "approved" ? (
            <Button
              onClick={onReject}
              variant="outline"
              size="sm"
              className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <XCircle className="h-4 w-4" /> Rechazar
            </Button>
          ) : (
            <>
              <Button
                onClick={onReject}
                variant="outline"
                size="sm"
                className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              >
                <XCircle className="h-4 w-4" /> Rechazar
              </Button>
              <Button onClick={onApprove} variant="brand" size="sm">
                <CheckCircle2 className="h-4 w-4" /> Aprobar
              </Button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

function DecisionDialog({
  script,
  action,
  advisorId,
  onClose,
  onSuccess,
}: {
  script: Script;
  action: ApprovalDecision;
  advisorId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [notes, setNotes] = useState("");

  const isReject = action === "rejected";
  const canSubmit = !isReject || notes.trim().length > 0;

  const mutation = useMutation({
    mutationFn: async () => {
      const approval = await submitScriptDecision({
        script_id: script.id,
        admin_id: script.owner_id,
        advisor_id: advisorId,
        decision: action,
        notes: notes.trim() || null,
      });
      // Notificación al admin (best-effort, si falla no rompe el flujo).
      try {
        await sendNotification({
          user_id: script.owner_id,
          kind: "script_advisor_decision",
          title:
            action === "approved"
              ? `Guion aprobado: ${script.title ?? "(sin título)"}`
              : `Guion rechazado: ${script.title ?? "(sin título)"}`,
          body: notes.trim() || undefined,
          link: `/app/admin/ideas/${script.id}`,
          dedupe_key: `script_advisor_decision:${approval.id}:${approval.updated_at}`,
          send_email: true,
        });
      } catch (_e) {
        // Silenciar — la decisión ya quedó persistida.
      }
      return approval;
    },
    onSuccess,
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-[var(--ll-border)] bg-[var(--ll-surface)]">
        <DialogHeader>
          <DialogTitle style={{ color: "var(--ll-text)" }}>
            {isReject ? "Rechazar guion" : "Aprobar guion"}
          </DialogTitle>
          <DialogDescription style={{ color: "var(--ll-text-muted)" }}>
            {script.title || "Sin título"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label
            className="text-xs uppercase tracking-[0.15em]"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: "var(--ll-text-muted)",
            }}
          >
            {isReject ? "Nota (obligatoria)" : "Nota (opcional)"}
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            placeholder={
              isReject
                ? "Explicá por qué lo rechazás (qué hay que cambiar)."
                : "Dejá una nota opcional (qué te gustó, sugerencias)."
            }
            disabled={mutation.isPending}
            className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
          />
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
            variant={isReject ? "outline" : "brand"}
            className={
              isReject
                ? "border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                : undefined
            }
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isReject ? (
              <XCircle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {isReject ? "Rechazar" : "Aprobar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({ tab }: { tab: TabValue }) {
  const messages: Record<TabValue, string> = {
    pendientes: "No hay drafts pendientes de revisión.",
    aprobados: "Todavía no aprobaste ningún guion.",
    rechazados: "Todavía no rechazaste ningún guion.",
  };
  return (
    <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-12 text-center">
      <div
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: "var(--ll-accent-dim)" }}
      >
        {tab === "pendientes" ? (
          <FileCheck className="h-5 w-5" style={{ color: "var(--ll-accent)" }} />
        ) : (
          <Sparkles className="h-5 w-5" style={{ color: "var(--ll-accent)" }} />
        )}
      </div>
      <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
        {messages[tab]}
      </p>
    </div>
  );
}
