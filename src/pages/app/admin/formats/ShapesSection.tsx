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
  deleteShape,
  reorderShapes,
  seedDefaultShapes,
  SUGGESTED_SHAPES,
  type Shape,
} from "@/lib/api/shapes";
import { useShapes } from "@/hooks/useShapes";
import { useSession } from "@/hooks/useSession";
import ShapeDialog from "@/pages/app/admin/formats/ShapeDialog";

export default function ShapesSection() {
  const { user } = useSession();
  const { data: shapes, isLoading } = useShapes();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Shape | null>(null);

  const qc = useQueryClient();

  const seedMutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("not authenticated");
      return seedDefaultShapes(user.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shapes"] });
      toast.success("Cargué los 3 shapes sugeridos. Editalos cuando quieras.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reorderMutation = useMutation({
    mutationFn: reorderShapes,
    onError: (err: Error) => toast.error(err.message),
    onSettled: () => qc.invalidateQueries({ queryKey: ["shapes"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteShape,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shapes"] });
      toast.success("Shape eliminado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    if (!shapes) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = shapes.findIndex((s) => s.id === active.id);
    const newIndex = shapes.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(shapes, oldIndex, newIndex);
    qc.setQueryData(["shapes"], next);
    reorderMutation.mutate(next.map((s) => s.id));
  }

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(shape: Shape) {
    setEditing(shape);
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
            Shapes
          </div>
          <h2
            className="text-2xl"
            style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
          >
            Cómo <em style={{ color: "var(--ll-warm)" }}>estructurás</em> el guion
          </h2>
          <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
            La estructura narrativa del video (hook → beats → CTA). Es ortogonal al formato:
            un mismo shape se puede grabar talking head, con pizarrón, o sobre pantalla.
          </p>
        </div>
        {shapes && shapes.length > 0 && (
          <Button variant="brand" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nuevo shape
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

      {!isLoading && (!shapes || shapes.length === 0) && (
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
            Empezá con los shapes sugeridos
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--ll-text-muted)" }}>
            Te cargamos {SUGGESTED_SHAPES.length} estructuras narrativas para testear (Antes/Después,
            Stack tour, Hot take + demo). Editá las que quieras.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button
              variant="brand"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
            >
              <Sparkles className="h-4 w-4" />
              {seedMutation.isPending ? "Cargando..." : "Cargar shapes sugeridos"}
            </Button>
            <Button variant="outline" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Crear de cero
            </Button>
          </div>
        </div>
      )}

      {shapes && shapes.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={shapes.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {shapes.map((shape) => (
                <ShapeItem
                  key={shape.id}
                  shape={shape}
                  onEdit={() => openEdit(shape)}
                  onDelete={() => {
                    if (confirm(`¿Borrar "${shape.name}"?`)) deleteMutation.mutate(shape.id);
                  }}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <ShapeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        shape={editing}
        nextPosition={shapes?.length ?? 0}
      />
    </section>
  );
}

function ShapeItem({
  shape,
  onEdit,
  onDelete,
}: {
  shape: Shape;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: shape.id,
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
            {shape.name}
          </h3>
          {shape.example_url && (
            <a
              href={shape.example_url}
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
        {shape.description && (
          <p className="mt-1 text-sm" style={{ color: "var(--ll-text-muted)" }}>
            {shape.description}
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
