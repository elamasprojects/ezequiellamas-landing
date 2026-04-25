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
  deleteFormat,
  reorderFormats,
  seedDefaultFormats,
  SUGGESTED_FORMATS,
  type Format,
} from "@/lib/api/formats";
import { useFormats } from "@/hooks/useFormats";
import { useSession } from "@/hooks/useSession";
import FormatDialog from "@/pages/app/admin/formats/FormatDialog";

export default function FormatsList() {
  const { user } = useSession();
  const { data: formats, isLoading } = useFormats();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Format | null>(null);

  const qc = useQueryClient();

  const seedMutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("not authenticated");
      return seedDefaultFormats(user.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["formats"] });
      toast.success("Cargué los 5 formatos sugeridos. Editá los que quieras.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reorderMutation = useMutation({
    mutationFn: reorderFormats,
    onError: (err: Error) => toast.error(err.message),
    onSettled: () => qc.invalidateQueries({ queryKey: ["formats"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFormat,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["formats"] });
      toast.success("Formato eliminado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    if (!formats) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = formats.findIndex((f) => f.id === active.id);
    const newIndex = formats.findIndex((f) => f.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(formats, oldIndex, newIndex);
    qc.setQueryData(["formats"], next);
    reorderMutation.mutate(next.map((f) => f.id));
  }

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(format: Format) {
    setEditing(format);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
          >
            Formatos
          </div>
          <h1
            className="text-3xl"
            style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
          >
            Cómo <em style={{ color: "var(--ll-warm)" }}>grabás</em> tus videos
          </h1>
          <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
            Cada formato describe un tipo de grabación. La IA usa este catálogo cuando genera guiones para sugerirte el
            formato más apropiado.
          </p>
        </div>
        {formats && formats.length > 0 && (
          <Button variant="brand" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nuevo formato
          </Button>
        )}
      </header>

      {isLoading && (
        <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-12 text-center text-sm" style={{ color: "var(--ll-text-muted)" }}>
          Cargando...
        </div>
      )}

      {!isLoading && (!formats || formats.length === 0) && (
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
            Empezá con los formatos sugeridos
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--ll-text-muted)" }}>
            Te cargamos {SUGGESTED_FORMATS.length} formatos típicos para creators (pantalla+rostro, calle, entrevista,
            pregunta+respuesta, talking head). Editás los que quieras después.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button
              variant="brand"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
            >
              <Sparkles className="h-4 w-4" />
              {seedMutation.isPending ? "Cargando..." : "Cargar formatos sugeridos"}
            </Button>
            <Button variant="outline" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Crear de cero
            </Button>
          </div>
        </div>
      )}

      {formats && formats.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={formats.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {formats.map((format) => (
                <FormatItem
                  key={format.id}
                  format={format}
                  onEdit={() => openEdit(format)}
                  onDelete={() => {
                    if (confirm(`¿Borrar "${format.name}"?`)) deleteMutation.mutate(format.id);
                  }}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <FormatDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        format={editing}
        nextPosition={formats?.length ?? 0}
      />
    </div>
  );
}

function FormatItem({
  format,
  onEdit,
  onDelete,
}: {
  format: Format;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: format.id,
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
        className="mt-1 cursor-grab touch-none rounded p-1 opacity-40 hover:opacity-100 active:cursor-grabbing"
        style={{ color: "var(--ll-text-muted)" }}
        aria-label="Reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium" style={{ color: "var(--ll-text)" }}>
            {format.name}
          </h3>
          {format.example_url && (
            <a
              href={format.example_url}
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
        {format.description && (
          <p className="mt-1 text-sm" style={{ color: "var(--ll-text-muted)" }}>
            {format.description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
