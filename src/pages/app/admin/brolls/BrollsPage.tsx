import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  Download,
  Film,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteBrollStyle,
  dispatchBrollGeneration,
  type BrollStyle,
  type BrollStyleInsert,
  type BrollSuggestionWithScript,
} from "@/lib/api/brolls";
import BrollTimeline from "@/components/app/BrollTimeline";
import {
  BROLL_TEMPLATES,
  TEMPLATE_CATEGORY,
  TEMPLATE_LABEL,
  TEMPLATE_DESCRIPTION,
  type BrollTemplate,
  type BrollCategory,
} from "@/lib/broll/types";
import {
  useCreateBrollStyle,
  useDeleteBrollStyle,
  useQueuedBrolls,
  useUpdateBrollStyle,
  useBrollStyles,
} from "@/hooks/useBrolls";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  idle: "Sin generar",
  queued: "En cola",
  processing: "Generando…",
  done: "Listo",
  failed: "Error",
};

const STATUS_CLASS: Record<string, string> = {
  idle: "border-[var(--ll-border)] text-[var(--ll-text-muted)]",
  queued:
    "border-[var(--ll-accent)]/40 bg-[var(--ll-accent)]/15 text-[var(--ll-accent)] animate-pulse",
  processing:
    "border-[var(--ll-warm)]/40 bg-[var(--ll-warm)]/15 text-[var(--ll-warm)] animate-pulse",
  done: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  failed: "border-red-500/40 bg-red-500/15 text-red-300",
};

const VARIANT_LABEL: Record<string, string> = {
  v1: "NanoBanana + Kling",
  v2: "Remotion + Hypermotion",
};

// ──────────────────────────────────────────────────────────────────────────────
// Queue tab
// ──────────────────────────────────────────────────────────────────────────────

function BrollQueueItem({ broll }: { broll: BrollSuggestionWithScript }) {
  const qc = useQueryClient();
  const genStatus = broll.generation_status ?? "idle";
  const script = broll.scripts;

  const dispatchMutation = useMutation({
    mutationFn: () => dispatchBrollGeneration(broll.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brolls", "queue"] });
      toast.success("B-roll enviado a generación");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded"
          style={{ background: "var(--ll-accent-dim)", color: "var(--ll-accent)" }}
        >
          <Film className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: "var(--ll-text)" }}>
            {broll.suggestion}
          </p>
          {script && (
            <Link
              to={`/app/admin/ideas/${script.id}`}
              className="text-xs hover:underline"
              style={{ color: "var(--ll-text-muted)" }}
            >
              {script.title ?? script.hook?.slice(0, 60) ?? "Sin título"}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant="outline"
            className={cn("border text-[10px]", STATUS_CLASS[genStatus])}
          >
            {STATUS_LABEL[genStatus]}
          </Badge>
          {broll.output_url && genStatus === "done" && (
            <Button asChild variant="ghost" size="sm" className="h-7 w-7 p-0">
              <a href={broll.output_url} download target="_blank" rel="noreferrer">
                <Download className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-2 text-xs" style={{ color: "var(--ll-text-muted)" }}>
        {broll.variant && (
          <Badge
            variant="outline"
            className="border-[var(--ll-border)] text-[var(--ll-text-muted)] text-[10px]"
          >
            {VARIANT_LABEL[broll.variant] ?? broll.variant}
          </Badge>
        )}
        {broll.broll_styles && (
          <Badge
            variant="outline"
            className="border-[var(--ll-accent)]/30 text-[var(--ll-accent)] text-[10px]"
          >
            {broll.broll_styles.name}
          </Badge>
        )}
        {broll.is_manual && (
          <Badge
            variant="outline"
            className="border-[var(--ll-blue)]/40 text-[var(--ll-blue)] text-[10px]"
          >
            manual
          </Badge>
        )}
        <span
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
          className="ml-auto"
        >
          {formatDistanceToNow(new Date(broll.created_at), {
            addSuffix: true,
            locale: es,
          })}
        </span>
      </div>

      {broll.image_description && (
        <p className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
          <span className="font-medium" style={{ color: "var(--ll-text)" }}>
            Imagen:
          </span>{" "}
          {broll.image_description}
        </p>
      )}
      {broll.animation_description && (
        <p className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
          <span className="font-medium" style={{ color: "var(--ll-text)" }}>
            Animación:
          </span>{" "}
          {broll.animation_description}
        </p>
      )}
      {broll.selected_words && broll.selected_words.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {broll.selected_words.map((w) => (
            <Badge
              key={w}
              variant="outline"
              className="border-[var(--ll-accent)]/30 text-[var(--ll-accent)] text-[10px]"
            >
              {w}
            </Badge>
          ))}
        </div>
      )}

      {/* Pipeline timeline (expanded por default, collapsable) */}
      <BrollTimeline broll={broll} />

      {/* Actions */}
      {genStatus === "idle" && (
        <div className="flex justify-end pt-1 border-t border-[var(--ll-border)]">
          <Button
            variant="brand"
            size="sm"
            className="h-7 text-xs"
            disabled={dispatchMutation.isPending || !broll.variant}
            onClick={() => dispatchMutation.mutate()}
            title={!broll.variant ? "Elegí una variante en el guion primero" : undefined}
          >
            {dispatchMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <Sparkles className="h-3 w-3" /> Generar
              </>
            )}
          </Button>
        </div>
      )}
      {genStatus === "failed" && (
        <div className="space-y-2 pt-1 border-t border-[var(--ll-border)]">
          {broll.generation_error && (
            <details className="rounded-md border border-red-500/30 bg-red-500/5 p-2">
              <summary className="cursor-pointer text-xs text-red-300 font-mono">
                Detalle del error
              </summary>
              <pre className="mt-2 whitespace-pre-wrap text-[10px] text-red-200/80 font-mono">
                {broll.generation_error}
              </pre>
            </details>
          )}
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
              disabled={dispatchMutation.isPending}
              onClick={() => dispatchMutation.mutate()}
            >
              {dispatchMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Reintentar"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function QueueTab() {
  const { data: brolls, isLoading } = useQueuedBrolls();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full bg-[var(--ll-surface)]" />
        <Skeleton className="h-28 w-full bg-[var(--ll-surface)]" />
      </div>
    );
  }

  if (!brolls || brolls.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-8 text-center">
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: "var(--ll-accent-dim)" }}
        >
          <Film className="h-5 w-5" style={{ color: "var(--ll-accent)" }} />
        </div>
        <h3
          className="text-xl"
          style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}
        >
          La cola está vacía
        </h3>
        <p
          className="mx-auto mt-2 max-w-md text-sm"
          style={{ color: "var(--ll-text-muted)" }}
        >
          Abrí un guion, marcá B-rolls para crear y volvé acá para generarlos.
        </p>
        <Button asChild variant="brand" className="mt-6">
          <Link to="/app/admin/ideas">
            <Film className="h-4 w-4" /> Ir a guiones
          </Link>
        </Button>
      </div>
    );
  }

  const idle = brolls.filter((b) => b.generation_status === "idle");
  const inProgress = brolls.filter(
    (b) => b.generation_status === "queued" || b.generation_status === "processing",
  );
  const done = brolls.filter((b) => b.generation_status === "done");
  const failed = brolls.filter((b) => b.generation_status === "failed");

  return (
    <div className="space-y-6">
      {inProgress.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-xs uppercase tracking-widest" style={{ color: "var(--ll-warm)", fontFamily: "'JetBrains Mono', monospace" }}>
            En progreso ({inProgress.length})
          </h3>
          {inProgress.map((b) => (
            <BrollQueueItem key={b.id} broll={b} />
          ))}
        </section>
      )}

      {idle.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-xs uppercase tracking-widest" style={{ color: "var(--ll-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
            Pendientes ({idle.length})
          </h3>
          {idle.map((b) => (
            <BrollQueueItem key={b.id} broll={b} />
          ))}
        </section>
      )}

      {failed.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-xs uppercase tracking-widest" style={{ color: "rgb(248 113 113)", fontFamily: "'JetBrains Mono', monospace" }}>
            Con errores ({failed.length})
          </h3>
          {failed.map((b) => (
            <BrollQueueItem key={b.id} broll={b} />
          ))}
        </section>
      )}

      {done.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-xs uppercase tracking-widest" style={{ color: "rgb(52 211 153)", fontFamily: "'JetBrains Mono', monospace" }}>
            Listos para descargar ({done.length})
          </h3>
          {done.map((b) => (
            <BrollQueueItem key={b.id} broll={b} />
          ))}
        </section>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Styles tab
// ──────────────────────────────────────────────────────────────────────────────

const EMPTY_STYLE: Omit<BrollStyleInsert, "owner_id"> = {
  name: "",
  variant: "v1",
  image_prompt: null,
  animation_prompt: null,
  template_code: null,
  template_name: null,
  thumbnail_url: null,
  position: 0,
};

function StyleForm({
  initial,
  onSubmit,
  onCancel,
  isPending,
}: {
  initial: Omit<BrollStyleInsert, "owner_id">;
  onSubmit: (data: Omit<BrollStyleInsert, "owner_id">) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState(initial);
  const patch = (key: string, val: string | null) =>
    setForm((p) => ({ ...p, [key]: val }));

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
          Nombre *
        </Label>
        <Input
          value={form.name}
          onChange={(e) => patch("name", e.target.value)}
          placeholder="Ej: Motion urbano dark"
          className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
          Variante *
        </Label>
        <Select
          value={form.variant}
          onValueChange={(v) => patch("variant", v)}
        >
          <SelectTrigger className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
            <SelectItem value="v1">V1 — NanoBanana + Kling</SelectItem>
            <SelectItem value="v2">V2 — Remotion + Hypermotion</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {form.variant === "v1" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
              Prompt de imagen (NanoBanana 2)
            </Label>
            <Textarea
              value={form.image_prompt ?? ""}
              onChange={(e) => patch("image_prompt", e.target.value || null)}
              placeholder="System prompt con la estética visual, paleta, referencias..."
              rows={5}
              className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)] text-sm font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
              Prompt de animación (Kling)
            </Label>
            <Textarea
              value={form.animation_prompt ?? ""}
              onChange={(e) => patch("animation_prompt", e.target.value || null)}
              placeholder="System prompt con el tipo de movimiento, ritmo, estilo..."
              rows={5}
              className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)] text-sm font-mono"
            />
          </div>
        </>
      )}

      {form.variant === "v2" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
              Template
            </Label>
            <Select
              value={(form as { template_name?: string | null }).template_name ?? "WordStack"}
              onValueChange={(v) => patch("template_name", v)}
            >
              <SelectTrigger className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
                <SelectValue placeholder="Elegí un template" />
              </SelectTrigger>
              <SelectContent className="border-[var(--ll-border)] bg-[var(--ll-surface)]">
                {(["text-animation", "posters", "infographics", "presentation"] as BrollCategory[]).map((cat) => {
                  const templates = BROLL_TEMPLATES.filter((t) => TEMPLATE_CATEGORY[t] === cat);
                  return (
                    <div key={cat}>
                      <div
                        className="px-2 pt-2 pb-1 text-[9px] uppercase tracking-[0.2em] font-mono"
                        style={{ color: "var(--ll-text-dim)" }}
                      >
                        {cat.replace("-", " ")}
                      </div>
                      {templates.map((t) => (
                        <SelectItem key={t} value={t}>
                          <div className="flex flex-col">
                            <span className="font-medium">{TEMPLATE_LABEL[t]}</span>
                            <span
                              className="text-[10px]"
                              style={{ color: "var(--ll-text-dim)" }}
                            >
                              {TEMPLATE_DESCRIPTION[t]}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-[10px]" style={{ color: "var(--ll-text-dim)" }}>
              8 templates en 4 categorías. Elegí el que matchee con el tipo de
              broll que querés generar.
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
              Override JSON (opcional)
            </Label>
            <Textarea
              value={form.template_code ?? ""}
              onChange={(e) => patch("template_code", e.target.value || null)}
              placeholder={`{\n  "bg": "#0a0a0a",\n  "accent": "#c8ff00",\n  "stagger": 0.18\n}`}
              rows={6}
              className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)] text-xs font-mono"
            />
            <p className="text-[10px]" style={{ color: "var(--ll-text-dim)" }}>
              Vacío = defaults de marca. Override con <code>bg</code>,{" "}
              <code>accent</code>, <code>secondary</code>, <code>stagger</code>,{" "}
              <code>ease</code>.
            </p>
          </div>
        </>
      )}

      <div className="space-y-1">
        <Label className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
          URL de thumbnail/preview (opcional)
        </Label>
        <Input
          value={form.thumbnail_url ?? ""}
          onChange={(e) => patch("thumbnail_url", e.target.value || null)}
          placeholder="https://..."
          className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
          Posición
        </Label>
        <Input
          type="number"
          min={0}
          value={String(form.position ?? 0)}
          onChange={(e) => patch("position", e.target.value)}
          className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
        <Button
          variant="brand"
          disabled={isPending || !form.name.trim()}
          onClick={() => onSubmit(form)}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
        </Button>
      </div>
    </div>
  );
}

function StyleCard({
  style,
  onEdit,
}: {
  style: BrollStyle;
  onEdit: (s: BrollStyle) => void;
}) {
  const qc = useQueryClient();
  const [deleting, setDeleting] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => deleteBrollStyle(style.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brolls", "styles"] });
      toast.success("Estilo eliminado");
      setDeleting(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <>
      <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4 space-y-2">
        <div className="flex items-start gap-3">
          {style.thumbnail_url ? (
            <img
              src={style.thumbnail_url}
              alt=""
              className="h-14 w-14 shrink-0 rounded object-cover border border-[var(--ll-border)]"
            />
          ) : (
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded border border-[var(--ll-border)]"
              style={{ background: "var(--ll-surface-2)" }}
            >
              <Sparkles className="h-5 w-5" style={{ color: "var(--ll-text-dim)" }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm" style={{ color: "var(--ll-text)" }}>
                {style.name}
              </h4>
              <Badge
                variant="outline"
                className="border-[var(--ll-border)] text-[var(--ll-text-muted)] text-[10px]"
              >
                {style.variant === "v1" ? "NanaBanana+Kling" : "Remotion"}
              </Badge>
            </div>
            <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--ll-text-muted)" }}>
              {style.variant === "v1"
                ? style.image_prompt?.slice(0, 120) ?? "Sin prompt de imagen"
                : style.template_code?.slice(0, 120) ?? "Sin template code"}
            </p>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => onEdit(style)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
              onClick={() => setDeleting(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={deleting} onOpenChange={(o) => !o && setDeleting(false)}>
        <DialogContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Instrument Serif', serif" }}>
              ¿Eliminar "{style.name}"?
            </DialogTitle>
            <DialogDescription style={{ color: "var(--ll-text-muted)" }}>
              Los B-rolls que usaban este estilo quedan sin estilo asignado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(false)}>
              Cancelar
            </Button>
            <Button
              variant="brand"
              className="bg-red-500/15 text-red-300 hover:bg-red-500/25"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? "Eliminando…" : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StylesSubTab({ variant }: { variant: "v1" | "v2" }) {
  const { data: styles, isLoading } = useBrollStyles();
  const createMutation = useCreateBrollStyle();
  const updateMutation = useUpdateBrollStyle();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<BrollStyle | null>(null);

  const filtered = styles?.filter((s) => s.variant === variant) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-2 pt-4">
        <Skeleton className="h-20 w-full bg-[var(--ll-surface)]" />
        <Skeleton className="h-20 w-full bg-[var(--ll-surface)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      {creating && (
        <div className="rounded-lg border border-[var(--ll-accent)]/30 bg-[var(--ll-surface)] p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium" style={{ color: "var(--ll-accent)" }}>
              Nuevo estilo {variant === "v1" ? "V1" : "V2"}
            </h4>
            <button type="button" onClick={() => setCreating(false)}>
              <X className="h-4 w-4" style={{ color: "var(--ll-text-muted)" }} />
            </button>
          </div>
          <StyleForm
            initial={{ ...EMPTY_STYLE, variant }}
            onSubmit={(data) => {
              createMutation.mutate(data, {
                onSuccess: () => {
                  toast.success("Estilo creado");
                  setCreating(false);
                },
                onError: (err: Error) => toast.error(err.message),
              });
            }}
            onCancel={() => setCreating(false)}
            isPending={createMutation.isPending}
          />
        </div>
      )}

      {filtered.length === 0 && !creating ? (
        <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-6 text-center">
          <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
            Sin estilos {variant === "v1" ? "V1 (NanoBanana+Kling)" : "V2 (Remotion)"}. Creá el
            primero.
          </p>
          <Button
            variant="brand"
            className="mt-4"
            onClick={() => setCreating(true)}
          >
            <Plus className="h-4 w-4" /> Nuevo estilo
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {filtered.map((s) => (
              <StyleCard key={s.id} style={s} onEdit={setEditing} />
            ))}
          </div>
          {!creating && (
            <Button variant="outline" className="border-[var(--ll-border)]" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Nuevo estilo
            </Button>
          )}
        </>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)] max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Instrument Serif', serif" }}>
              Editar estilo
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <StyleForm
              initial={{
                name: editing.name,
                variant: editing.variant as "v1" | "v2",
                image_prompt: editing.image_prompt,
                animation_prompt: editing.animation_prompt,
                template_code: editing.template_code,
                template_name: editing.template_name ?? null,
                thumbnail_url: editing.thumbnail_url,
                position: editing.position,
              }}
              onSubmit={(data) => {
                updateMutation.mutate(
                  { id: editing.id, input: data },
                  {
                    onSuccess: () => {
                      toast.success("Estilo actualizado");
                      setEditing(null);
                    },
                    onError: (err: Error) => toast.error(err.message),
                  },
                );
              }}
              onCancel={() => setEditing(null)}
              isPending={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StylesTab() {
  return (
    <Tabs defaultValue="v1" className="mt-2">
      <TabsList className="bg-[var(--ll-surface-2)]">
        <TabsTrigger value="v1">V1 — NanoBanana + Kling</TabsTrigger>
        <TabsTrigger value="v2">V2 — Remotion</TabsTrigger>
      </TabsList>
      <TabsContent value="v1">
        <StylesSubTab variant="v1" />
      </TabsContent>
      <TabsContent value="v2">
        <StylesSubTab variant="v2" />
      </TabsContent>
    </Tabs>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Page root
// ──────────────────────────────────────────────────────────────────────────────

export default function BrollsPage() {
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
          B-rolls
        </div>
        <h1
          className="text-2xl md:text-3xl"
          style={{
            fontFamily: "'Instrument Serif', serif",
            letterSpacing: "-0.025em",
            lineHeight: 1.1,
          }}
        >
          Generador de <em style={{ color: "var(--ll-warm)" }}>B-rolls</em>
        </h1>
        <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
          Cola de B-rolls marcados para crear. Elegí la variante (NanoBanana+Kling o
          Remotion+Hypermotion) desde el guion y generá desde acá.
        </p>
      </header>

      <Tabs defaultValue="queue" className="space-y-6">
        <TabsList className="bg-[var(--ll-surface-2)]">
          <TabsTrigger value="queue">
            <Film className="h-3.5 w-3.5 mr-1.5" /> Cola
          </TabsTrigger>
          <TabsTrigger value="styles">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Estilos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          <QueueTab />
        </TabsContent>

        <TabsContent value="styles">
          <StylesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
