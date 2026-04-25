import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import BrollList from "@/components/app/BrollList";
import { useScript } from "@/hooks/useScript";
import { useFormats } from "@/hooks/useFormats";
import { deleteScript, updateScript, type ScriptStatus } from "@/lib/api/scripts";

const STATUSES: { value: ScriptStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Agendado" },
  { value: "recorded", label: "Grabado" },
  { value: "posted", label: "Posteado" },
  { value: "archived", label: "Archivado" },
];

const NO_FORMAT = "__none__";

export default function ScriptEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: script, isLoading } = useScript(id);
  const { data: formats } = useFormats();

  const [title, setTitle] = useState("");
  const [hook, setHook] = useState("");
  const [development, setDevelopment] = useState("");
  const [cta, setCta] = useState("");
  const [status, setStatus] = useState<ScriptStatus>("draft");
  const [scheduledAt, setScheduledAt] = useState("");
  const [formatId, setFormatId] = useState<string>(NO_FORMAT);

  useEffect(() => {
    if (!script) return;
    setTitle(script.title ?? "");
    setHook(script.hook ?? "");
    setDevelopment(script.development ?? "");
    setCta(script.cta ?? "");
    setStatus((script.status as ScriptStatus) ?? "draft");
    setScheduledAt(
      script.scheduled_at ? new Date(script.scheduled_at).toISOString().slice(0, 16) : "",
    );
    setFormatId(script.format_id ?? NO_FORMAT);
  }, [script]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!id) throw new Error("no script id");
      return updateScript(id, {
        title: title.trim() || null,
        hook: hook.trim() || null,
        development: development.trim() || null,
        cta: cta.trim() || null,
        status,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        format_id: formatId === NO_FORMAT ? null : formatId,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["script", id] });
      qc.invalidateQueries({ queryKey: ["scripts"] });
      toast.success("Guion guardado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!id) throw new Error("no script id");
      return deleteScript(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scripts"] });
      toast.success("Guion eliminado");
      navigate("/app/admin/ideas", { replace: true });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return <Skeleton className="h-96 w-full bg-[var(--ll-surface)]" />;
  }
  if (!script) {
    return (
      <div className="space-y-4">
        <p style={{ color: "var(--ll-text-muted)" }}>Guion no encontrado.</p>
        <Button asChild variant="outline">
          <Link to="/app/admin/ideas">
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
          <Link to="/app/admin/ideas">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (confirm("¿Eliminar este guion?")) deleteMutation.mutate();
          }}
          disabled={deleteMutation.isPending}
          className="text-[var(--ll-text-muted)] hover:text-red-400"
        >
          <Trash2 className="h-4 w-4" /> Eliminar
        </Button>
      </div>

      <header className="space-y-2">
        <div
          className="text-[10px] uppercase tracking-[0.25em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
        >
          Guion
        </div>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título"
          className="border-0 bg-transparent px-0 text-3xl shadow-none focus-visible:ring-0 md:text-4xl"
          style={{
            fontFamily: "'Instrument Serif', serif",
            letterSpacing: "-0.025em",
            color: "var(--ll-text)",
            height: "auto",
          }}
        />
        {script.ai_summary && (
          <p className="max-w-2xl text-sm italic" style={{ color: "var(--ll-text-muted)" }}>
            {script.ai_summary}
          </p>
        )}
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Section
            label="Hook"
            hint="0–5s · ≤25 palabras"
            accent="var(--ll-accent)"
            value={hook}
            onChange={setHook}
            rows={2}
          />
          <Section
            label="Development"
            hint="60–120 palabras"
            accent="var(--ll-warm)"
            value={development}
            onChange={setDevelopment}
            rows={6}
          />
          <Section
            label="CTA"
            hint="≤20 palabras"
            accent="var(--ll-blue)"
            value={cta}
            onChange={setCta}
            rows={2}
          />
        </div>

        <aside className="space-y-6">
          <div className="space-y-2">
            <Label style={{ color: "var(--ll-text-muted)" }}>Estado</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ScriptStatus)}>
              <SelectTrigger className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label style={{ color: "var(--ll-text-muted)" }}>Formato</Label>
            <Select value={formatId} onValueChange={setFormatId}>
              <SelectTrigger className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]">
                <SelectValue placeholder="Sin formato" />
              </SelectTrigger>
              <SelectContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
                <SelectItem value={NO_FORMAT}>Sin formato</SelectItem>
                {formats?.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduled" style={{ color: "var(--ll-text-muted)" }}>
              Agendar
            </Label>
            <Input
              id="scheduled"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
            />
          </div>

          {script.tone && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.15em]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}>
                Tono
              </span>
              <div className="text-sm" style={{ color: "var(--ll-text-muted)" }}>{script.tone}</div>
            </div>
          )}
          {script.estimated_wpm && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.15em]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}>
                WPM estimado
              </span>
              <div className="text-sm" style={{ color: "var(--ll-text-muted)" }}>{script.estimated_wpm}</div>
            </div>
          )}

          <div className="space-y-2 pt-4 border-t border-[var(--ll-border)]">
            <Label style={{ color: "var(--ll-text-muted)" }}>B-rolls sugeridos</Label>
            <BrollList brolls={script.broll_suggestions} />
          </div>
        </aside>
      </div>

      <div className="sticky bottom-4 flex justify-end">
        <Button
          variant="brand"
          size="lg"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="shadow-lg"
        >
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}

function Section({
  label,
  hint,
  accent,
  value,
  onChange,
  rows,
}: {
  label: string;
  hint: string;
  accent: string;
  value: string;
  onChange: (v: string) => void;
  rows: number;
}) {
  return (
    <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-5">
      <div className="mb-2 flex items-center justify-between">
        <span
          className="text-[10px] uppercase tracking-[0.2em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: accent }}
        >
          {label}
        </span>
        <span
          className="text-[10px] uppercase tracking-[0.15em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
        >
          {hint}
        </span>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="resize-none border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
        style={{ color: "var(--ll-text)" }}
      />
    </div>
  );
}
