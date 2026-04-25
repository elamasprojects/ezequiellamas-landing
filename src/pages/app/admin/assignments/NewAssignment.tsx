import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useScripts } from "@/hooks/useScripts";
import { useSession } from "@/hooks/useSession";
import { fetchTeamMembers } from "@/lib/api/roles";
import { createAssignment } from "@/lib/api/assignments";
import { sendNotification } from "@/lib/api/notifications";
import type { AssignmentInsert } from "@/lib/api/assignments";

const NO_VALUE = "__none__";

export default function NewAssignment() {
  const navigate = useNavigate();
  const { user } = useSession();

  const { data: members } = useQuery({ queryKey: ["team_members"], queryFn: fetchTeamMembers });
  const { data: scripts } = useScripts();

  const editors = (members ?? []).filter((m) => m.roles.includes("editor"));

  const [editorId, setEditorId] = useState<string>(NO_VALUE);
  const [scriptId, setScriptId] = useState<string>(NO_VALUE);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [rawDriveUrl, setRawDriveUrl] = useState("");
  const [brollsDriveUrl, setBrollsDriveUrl] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Auto-populate title when script chosen
  useEffect(() => {
    if (scriptId === NO_VALUE || !scripts || title) return;
    const s = scripts.find((x) => x.id === scriptId);
    if (s?.title) setTitle(s.title);
  }, [scriptId, scripts, title]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!title.trim()) {
      toast.error("El título es requerido");
      return;
    }
    setSubmitting(true);
    try {
      const insert: AssignmentInsert = {
        owner_id: user.id,
        editor_id: editorId === NO_VALUE ? null : editorId,
        script_id: scriptId === NO_VALUE ? null : scriptId,
        title: title.trim(),
        instructions: instructions.trim() || null,
        raw_drive_url: rawDriveUrl.trim() || null,
        brolls_drive_url: brollsDriveUrl.trim() || null,
        due_date: dueDate || null,
        payment_amount: paymentAmount ? Number(paymentAmount) : null,
      };
      const created = await createAssignment(insert);
      toast.success("Asignación creada");

      // Notify the editor
      if (insert.editor_id) {
        const link = `${window.location.origin}/app/editor/${created.id}`;
        await sendNotification({
          user_id: insert.editor_id,
          kind: "assignment_created",
          title: title.trim(),
          body: instructions.trim() || undefined,
          link,
          dedupe_key: `assignment_created:${created.id}`,
          send_email: true,
          meta: {
            due_date: dueDate || null,
            payment: paymentAmount ? `USD ${paymentAmount}` : null,
          },
        });
      }

      navigate(`/app/admin/assignments/${created.id}`, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 text-[var(--ll-text-muted)]">
          <Link to="/app/admin/assignments">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
        </Button>
      </div>

      <header className="space-y-2">
        <div
          className="text-[10px] uppercase tracking-[0.25em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
        >
          Nueva asignación
        </div>
        <h1
          className="text-2xl md:text-3xl"
          style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
        >
          Asignale un <em style={{ color: "var(--ll-warm)" }}>video</em> al editor
        </h1>
      </header>

      <section className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Editor *">
            <Select value={editorId} onValueChange={setEditorId}>
              <SelectTrigger className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]">
                <SelectValue placeholder="Sin asignar" />
              </SelectTrigger>
              <SelectContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
                <SelectItem value={NO_VALUE}>Sin asignar</SelectItem>
                {editors.map((e) => (
                  <SelectItem key={e.user_id} value={e.user_id}>
                    {e.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Guion vinculado">
            <Select value={scriptId} onValueChange={setScriptId}>
              <SelectTrigger className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]">
                <SelectValue placeholder="Sin guion" />
              </SelectTrigger>
              <SelectContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
                <SelectItem value={NO_VALUE}>Sin guion</SelectItem>
                {scripts?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title || "(sin título)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Título *" full>
            <Input
              required
              placeholder="Ej. Reel sobre rodearte de gente que emprende"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
            />
          </Field>

          <Field label="Drive con crudos" full>
            <Input
              type="url"
              placeholder="https://drive.google.com/..."
              value={rawDriveUrl}
              onChange={(e) => setRawDriveUrl(e.target.value)}
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
            />
          </Field>

          <Field label="Drive con B-rolls" full>
            <Input
              type="url"
              placeholder="https://drive.google.com/..."
              value={brollsDriveUrl}
              onChange={(e) => setBrollsDriveUrl(e.target.value)}
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
            />
          </Field>

          <Field label="Fecha límite">
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
            />
          </Field>

          <Field label="Pago (USD)">
            <Input
              type="number"
              inputMode="decimal"
              placeholder="50"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
            />
          </Field>

          <Field label="Instrucciones" full>
            <Textarea
              placeholder="Detalle de qué tiene que editar, estilo, B-rolls específicos, etc."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={5}
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
            />
          </Field>
        </div>
      </section>

      <div
        className="sticky flex justify-end pt-4"
        style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <Button type="submit" variant="brand" size="lg" disabled={submitting} className="shadow-lg">
          <Save className="h-4 w-4" />
          {submitting ? "Creando..." : "Crear asignación"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? "sm:col-span-2 space-y-2" : "space-y-2"}>
      <Label style={{ color: "var(--ll-text-muted)" }}>{label}</Label>
      {children}
    </div>
  );
}
