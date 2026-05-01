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
import { ExternalLink, GripVertical, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  deleteSeries,
  reorderSeries,
  seedDefaultSeries,
  SUGGESTED_SERIES,
  type Series,
} from "@/lib/api/series";
import { useSeries } from "@/hooks/useSeries";
import { useSession } from "@/hooks/useSession";
import SeriesDialog from "@/pages/app/admin/formats/SeriesDialog";

export default function SeriesSection() {
  const { user } = useSession();
  const { data: series, isLoading } = useSeries();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Series | null>(null);

  const qc = useQueryClient();

  const seedMutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("not authenticated");
      return seedDefaultSeries(user.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["series"] });
      toast.success("Cargué las series sugeridas. Editá las que quieras.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reorderMutation = useMutation({
    mutationFn: reorderSeries,
    onError: (err: Error) => toast.error(err.message),
    onSettled: () => qc.invalidateQueries({ queryKey: ["series"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSeries,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["series"] });
      toast.success("Serie eliminada");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    if (!series) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = series.findIndex((s) => s.id === active.id);
    const newIndex = series.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(series, oldIndex, newIndex);
    qc.setQueryData(["series"], next);
    reorderMutation.mutate(next.map((s) => s.id));
  }

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(s: Series) {
    setEditing(s);
    setDialogOpen(true);
  }

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
          >
            Series
          </div>
          <h2
            className="text-2xl"
            style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
          >
            Cómo <em style={{ color: "var(--ll-warm)" }}>agrupás</em> los videos
          </h2>
          <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
            Una serie agrupa varios videos en una narrativa multi-parte (parte 1, 2, 3...).
            Cada guion/video se asocia a una serie y a un número de parte.
          </p>
        </div>
        {series && series.length > 0 && (
          <Button variant="brand" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nueva serie
          </Button>
        )}
      </div>

      {isLoading && (
        <div
          className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-12 text-center text-sm"
          style={{ color: "var(--ll-text-muted)" }}
        >
          Cargando...
        </div>
      )}

      {!isLoading && (!series || series.length === 0) && (
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
            Empezá con las series sugeridas
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--ll-text-muted)" }}>
            Te cargamos {SUGGESTED_SERIES.length} series para arrancar (Aplicando Claude a negocios,
            Funciones de Claude que no conocías). Editalas cuando quieras.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button
              variant="brand"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
            >
              <Sparkles className="h-4 w-4" />
              {seedMutation.isPending ? "Cargando..." : "Cargar series sugeridas"}
            </Button>
            <Button variant="outline" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Crear de cero
            </Button>
          </div>
        </div>
      )}

      {series && series.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={series.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {series.map((s) => (
                <SeriesItem
                  key={s.id}
                  series={s}
                  onEdit={() => openEdit(s)}
                  onDelete={() => {
                    if (confirm(`¿Borrar "${s.name}"?`)) deleteMutation.mutate(s.id);
                  }}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <SeriesDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        series={editing}
        nextPosition={series?.length ?? 0}
      />
    </section>
  );
}

function SeriesItem({
  series,
  onEdit,
  onDelete,
}: {
  series: Series;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: series.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
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

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium" style={{ color: "var(--ll-text)" }}>
            {series.name}
          </h3>
          {series.example_url && (
            <a
              href={series.example_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs"
              style={{ color: "var(--ll-text-dim)" }}
              aria-label="Abrir ejemplo"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        {series.description && (
          <p className="mt-1 text-sm" style={{ color: "var(--ll-text-muted)" }}>
            {series.description}
          </p>
        )}
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
