import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  Pencil,
  RefreshCw,
  Sparkles,
  Wand2,
  Image as ImageIcon,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useCover } from "@/hooks/useCovers";
import { useCoverStyles } from "@/hooks/useCoverStyles";
import {
  generateCover,
  editCover,
  updateCover,
  type CoverStatus,
  type CoverQuality,
} from "@/lib/api/covers";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<CoverStatus, string> = {
  idle: "Sin generar",
  generating: "Generando…",
  done: "Lista",
  failed: "Error",
  editing: "Editando…",
};

const STATUS_CLASS: Record<CoverStatus, string> = {
  idle: "border-[var(--ll-border)] text-[var(--ll-text-muted)]",
  generating: "border-[var(--ll-accent)]/40 bg-[var(--ll-accent)]/15 text-[var(--ll-accent)] animate-pulse",
  done: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  failed: "border-red-500/40 bg-red-500/15 text-red-300",
  editing: "border-[var(--ll-warm)]/40 bg-[var(--ll-warm)]/15 text-[var(--ll-warm)] animate-pulse",
};

export default function CoverDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: cover, isLoading } = useCover(id);
  const { data: styles } = useCoverStyles();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editInstruction, setEditInstruction] = useState("");
  const [styleDialogOpen, setStyleDialogOpen] = useState(false);
  const [newStyleId, setNewStyleId] = useState("");
  const [quality, setQuality] = useState<CoverQuality>("standard");

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["cover", id] });
    qc.invalidateQueries({ queryKey: ["covers"] });
  }

  const retryMutation = useMutation({
    mutationFn: () => generateCover(id!, { force: true, quality }),
    onSuccess: () => {
      toast.success("Portada regenerada");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const editMutation = useMutation({
    mutationFn: () => editCover(id!, editInstruction, { quality }),
    onSuccess: () => {
      toast.success("Portada editada");
      setEditDialogOpen(false);
      setEditInstruction("");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const changeStyleMutation = useMutation({
    mutationFn: async () => {
      if (!newStyleId) throw new Error("Seleccioná un estilo");
      await updateCover(id!, { cover_style_id: newStyleId });
      return generateCover(id!, { force: true, quality });
    },
    onSuccess: () => {
      toast.success("Estilo cambiado y portada regenerada");
      setStyleDialogOpen(false);
      setNewStyleId("");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isProcessing =
    cover?.status === "generating" || cover?.status === "editing";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 bg-[var(--ll-surface)]" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="aspect-[9/16] rounded-lg bg-[var(--ll-surface)]" />
          <Skeleton className="h-64 rounded-lg bg-[var(--ll-surface)]" />
        </div>
      </div>
    );
  }

  if (!cover) {
    return (
      <div className="text-center py-20" style={{ color: "var(--ll-text-muted)" }}>
        Portada no encontrada.
      </div>
    );
  }

  const status = cover.status as CoverStatus;
  const label =
    cover.title ||
    cover.scripts?.hook?.slice(0, 60) ||
    cover.videos?.title ||
    "Sin título";

  // Aspect ratio for image display
  const aspectClass =
    cover.aspect_ratio === "16:9"
      ? "aspect-video"
      : cover.aspect_ratio === "1:1"
        ? "aspect-square"
        : "aspect-[9/16]";

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 text-[var(--ll-text-muted)] hover:text-[var(--ll-text)]"
          onClick={() => navigate("/app/admin/covers")}
        >
          <ArrowLeft className="h-4 w-4" />
          Portadas
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1
              className="text-2xl"
              style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em" }}
            >
              {label}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm" style={{ color: "var(--ll-text-muted)" }}>
              {cover.cover_styles && <span>{cover.cover_styles.name}</span>}
              <span
                style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
              >
                {cover.aspect_ratio}
              </span>
              {cover.series && <span>{cover.series.name}</span>}
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn("border shrink-0", STATUS_CLASS[status])}
          >
            {STATUS_LABEL[status]}
          </Badge>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Imagen */}
        <div
          className={cn(
            "overflow-hidden rounded-lg border border-[var(--ll-border)] bg-[var(--ll-bg)]",
            aspectClass,
          )}
        >
          {cover.generated_image_url ? (
            <img
              src={cover.generated_image_url}
              alt={label}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8">
              {isProcessing ? (
                <>
                  <Sparkles
                    className="h-10 w-10 animate-pulse"
                    style={{ color: "var(--ll-accent)" }}
                  />
                  <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
                    {status === "editing" ? "Editando la portada…" : "Generando portada con IA…"}
                  </p>
                  <p className="text-xs" style={{ color: "var(--ll-text-dim)" }}>
                    Puede tardar 15-30 segundos.
                  </p>
                </>
              ) : (
                <>
                  <ImageIcon className="h-10 w-10" style={{ color: "var(--ll-text-dim)" }} />
                  {status === "failed" && cover.generation_error && (
                    <p className="text-center text-xs text-red-400">{cover.generation_error}</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Panel derecho */}
        <div className="space-y-4">
          {/* Idea fuerza */}
          {cover.idea_fuerza && (
            <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4">
              <p
                className="text-[10px] uppercase tracking-[0.2em] mb-1"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
              >
                Idea fuerza
              </p>
              <p
                className="text-2xl"
                style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}
              >
                <em style={{ color: "var(--ll-warm)" }}>{cover.idea_fuerza}</em>
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4 space-y-2 text-sm">
            {cover.scripts && (
              <MetaRow label="Guión" value={cover.scripts.title ?? "Sin título"} />
            )}
            {cover.videos && (
              <MetaRow label="Video" value={cover.videos.title ?? "Sin título"} />
            )}
            {cover.cover_styles && (
              <MetaRow label="Estilo" value={cover.cover_styles.name} />
            )}
            {cover.series && (
              <MetaRow label="Serie" value={cover.series.name} />
            )}
            <MetaRow label="Ratio" value={cover.aspect_ratio} mono />
          </div>

          {/* Calidad */}
          <div className="space-y-2">
            <div
              className="text-[10px] uppercase tracking-[0.15em]"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-muted)" }}
            >
              Calidad
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setQuality("standard")}
                disabled={isProcessing}
                className={`rounded-md border px-3 py-2 text-xs transition-colors disabled:opacity-50 ${
                  quality === "standard"
                    ? "border-[var(--ll-accent)] bg-[var(--ll-accent)]/10 text-[var(--ll-accent)]"
                    : "border-[var(--ll-border)] bg-[var(--ll-bg)] text-[var(--ll-text-muted)] hover:border-[var(--ll-border-hover)]"
                }`}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => setQuality("premium")}
                disabled={isProcessing}
                className={`rounded-md border px-3 py-2 text-xs transition-colors disabled:opacity-50 ${
                  quality === "premium"
                    ? "border-[var(--ll-accent)] bg-[var(--ll-accent)]/10 text-[var(--ll-accent)]"
                    : "border-[var(--ll-border)] bg-[var(--ll-bg)] text-[var(--ll-text-muted)] hover:border-[var(--ll-border-hover)]"
                }`}
              >
                Premium
              </button>
            </div>
          </div>

          {/* Acciones */}
          <div className="space-y-2">
            <Button
              variant="brand"
              className="w-full"
              disabled={isProcessing || retryMutation.isPending}
              onClick={() => retryMutation.mutate()}
            >
              <RefreshCw className="h-4 w-4" />
              {retryMutation.isPending ? "Regenerando…" : "Reintentar"}
            </Button>

            <Button
              variant="outline"
              className="w-full border-[var(--ll-border)] text-[var(--ll-text)]"
              disabled={isProcessing || !cover.generated_image_url}
              onClick={() => setEditDialogOpen(true)}
            >
              <Pencil className="h-4 w-4" />
              Editar con instrucción
            </Button>

            <Button
              variant="outline"
              className="w-full border-[var(--ll-border)] text-[var(--ll-text)]"
              disabled={isProcessing}
              onClick={() => {
                setNewStyleId(cover.cover_style_id ?? "");
                setStyleDialogOpen(true);
              }}
            >
              <Palette className="h-4 w-4" />
              Cambiar estilo
            </Button>

            {cover.generated_image_url && (
              <Button
                variant="ghost"
                className="w-full text-[var(--ll-text-muted)]"
                asChild
              >
                <a href={cover.generated_image_url} download={`portada-${id}.png`} target="_blank" rel="noreferrer">
                  <Download className="h-4 w-4" />
                  Descargar
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Prompt usado (colapsable) */}
      {cover.prompt_used && (
        <details className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)]">
          <summary
            className="cursor-pointer px-4 py-3 text-xs"
            style={{ color: "var(--ll-text-dim)", fontFamily: "'JetBrains Mono', monospace" }}
          >
            Prompt usado
          </summary>
          <p className="px-4 pb-4 text-xs whitespace-pre-wrap" style={{ color: "var(--ll-text-muted)" }}>
            {cover.prompt_used}
          </p>
        </details>
      )}

      {/* Dialog: editar */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}>
              Editar portada
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
              Describí qué querés cambiar. La IA regenera la portada incorporando el cambio.
            </p>
            <Textarea
              rows={3}
              placeholder="ej: 'Hacé el fondo más oscuro y agregá un glow violeta más intenso en el texto'"
              className="border-[var(--ll-border)] bg-[var(--ll-bg)] text-[var(--ll-text)] resize-none"
              value={editInstruction}
              onChange={(e) => setEditInstruction(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setEditDialogOpen(false)}
              disabled={editMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="brand"
              disabled={editMutation.isPending || !editInstruction.trim()}
              onClick={() => editMutation.mutate()}
            >
              <Wand2 className="h-4 w-4" />
              {editMutation.isPending ? "Aplicando…" : "Aplicar cambio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: cambiar estilo */}
      <Dialog open={styleDialogOpen} onOpenChange={setStyleDialogOpen}>
        <DialogContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}>
              Cambiar estilo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Nuevo estilo</Label>
            <Select value={newStyleId} onValueChange={setNewStyleId}>
              <SelectTrigger className="border-[var(--ll-border)] bg-[var(--ll-bg)] text-[var(--ll-text)]">
                <SelectValue placeholder="Seleccionar estilo…" />
              </SelectTrigger>
              <SelectContent className="border-[var(--ll-border)] bg-[var(--ll-surface)]">
                {styles?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setStyleDialogOpen(false)}
              disabled={changeStyleMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="brand"
              disabled={changeStyleMutation.isPending || !newStyleId}
              onClick={() => changeStyleMutation.mutate()}
            >
              <RefreshCw className="h-4 w-4" />
              {changeStyleMutation.isPending ? "Regenerando…" : "Aplicar y regenerar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-xs" style={{ color: "var(--ll-text-dim)" }}>
        {label}
      </span>
      <span
        className="truncate text-xs"
        style={{
          color: "var(--ll-text-muted)",
          fontFamily: mono ? "'JetBrains Mono', monospace" : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}
