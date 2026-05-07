import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  deleteCoverStyle,
  reorderCoverStyles,
  seedDefaultCoverStyles,
  SUGGESTED_COVER_STYLES,
  type CoverStyle,
} from "@/lib/api/coverStyles";
import { useCoverStyles } from "@/hooks/useCoverStyles";
import { useSession } from "@/hooks/useSession";
import QueryErrorState from "@/components/app/QueryErrorState";
import CoverStyleDialog from "./CoverStyleDialog";

export default function CoverStylesSection() {
  const { user } = useSession();
  const { data: styles, isLoading, isError, error, refetch } = useCoverStyles();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CoverStyle | null>(null);
  const qc = useQueryClient();

  const seedMutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("not authenticated");
      return seedDefaultCoverStyles(user.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cover_styles"] });
      toast.success(`Cargué ${SUGGESTED_COVER_STYLES.length} estilos sugeridos.`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reorderMutation = useMutation({
    mutationFn: reorderCoverStyles,
    onError: (err: Error) => toast.error(err.message),
    onSettled: () => qc.invalidateQueries({ queryKey: ["cover_styles"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCoverStyle,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cover_styles"] });
      toast.success("Estilo eliminado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    if (!styles) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = styles.findIndex((s) => s.id === active.id);
    const newIndex = styles.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(styles, oldIndex, newIndex);
    qc.setQueryData(["cover_styles"], next);
    reorderMutation.mutate(next.map((s) => s.id));
  }

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
          >
            Librería
          </div>
          <h2
            className="text-2xl"
            style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
          >
            Estilos de <em style={{ color: "var(--ll-warm)" }}>portada</em>
          </h2>
          <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
            Cada estilo define la composición visual, el encuadre y el tratamiento para la Capa 2 del
            sistema de prompts. La IA lo combina con el system prompt maestro y la serie para generar
            la portada.
          </p>
        </div>
        {styles && styles.length > 0 && (
          <Button
            variant="brand"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Nuevo estilo
          </Button>
        )}
      </div>

      {isLoading && (
        <div
          className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-12 text-center text-sm"
          style={{ color: "var(--ll-text-muted)" }}
        >
          Cargando…
        </div>
      )}

      {!isLoading && isError && (
        <QueryErrorState
          title="No pudimos cargar los estilos"
          detail={error instanceof Error ? error.message : String(error)}
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && (!styles || styles.length === 0) && (
        <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-12 text-center">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "var(--ll-accent-dim)" }}
          >
            <Sparkles className="h-5 w-5" style={{ color: "var(--ll-accent)" }} />
          </div>
          <h3
            className="text-xl"
            style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}
          >
            Sin estilos todavía
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--ll-text-muted)" }}>
            Cargá los {SUGGESTED_COVER_STYLES.length} estilos base (object, POV, split, data,
            cinematic) o creá uno desde cero.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button
              variant="brand"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
            >
              <Sparkles className="h-4 w-4" />
              {seedMutation.isPending ? "Cargando…" : "Cargar estilos sugeridos"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Crear de cero
            </Button>
          </div>
        </div>
      )}

      {styles && styles.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={styles.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {styles.map((style) => (
                <StyleItem
                  key={style.id}
                  style={style}
                  onEdit={() => {
                    setEditing(style);
                    setDialogOpen(true);
                  }}
                  onDelete={() => {
                    if (confirm(`¿Borrar "${style.name}"?`)) deleteMutation.mutate(style.id);
                  }}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <CoverStyleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        style={editing}
        nextPosition={styles?.length ?? 0}
      />
    </section>
  );
}

function StyleItem({
  style,
  onEdit,
  onDelete,
}: {
  style: CoverStyle;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: style.id,
  });
  const cssStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={cssStyle}
      className="group flex items-start gap-3 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4 transition-colors hover:border-[var(--ll-border-hover)]"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="-ml-1 cursor-grab touch-none rounded p-2 opacity-50 hover:opacity-100 active:cursor-grabbing"
        style={{ color: "var(--ll-text-muted)" }}
        aria-label="Reordenar"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="flex flex-1 min-w-0 items-start gap-3">
        {style.reference_image_url && (
          <img
            src={style.reference_image_url}
            alt={style.name}
            className="h-12 w-8 rounded object-cover shrink-0"
          />
        )}
        <div className="min-w-0">
          <h3 className="font-medium" style={{ color: "var(--ll-text)" }}>
            {style.name}
          </h3>
          {style.description && (
            <p className="mt-0.5 text-sm" style={{ color: "var(--ll-text-muted)" }}>
              {style.description}
            </p>
          )}
          {style.when_to_use && (
            <p className="mt-0.5 text-xs" style={{ color: "var(--ll-text-dim)" }}>
              {style.when_to_use}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          className="h-8 w-8 text-[var(--ll-text-muted)] hover:text-[var(--ll-text)]"
          aria-label="Editar"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-8 w-8 text-[var(--ll-text-muted)] hover:text-red-400"
          aria-label="Borrar"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}
