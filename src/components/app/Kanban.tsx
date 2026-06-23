import { useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

export interface KanbanColumn {
  id: string;
  label: string;
  /** Optional accent color for the column header dot. */
  accent?: string;
}

export interface KanbanItem {
  id: string;
  /** Column id this item currently belongs to. */
  column: string;
}

/**
 * Generic drag-and-drop Kanban. Columns are horizontal lanes; cards drag
 * between them. A small activation distance keeps plain clicks working
 * (so a card can both be dragged and opened).
 */
export default function Kanban<T extends KanbanItem>({
  columns,
  items,
  onMove,
  renderCard,
  emptyLabel = "Vacío",
}: {
  columns: KanbanColumn[];
  items: T[];
  onMove: (item: T, toColumn: string) => void;
  renderCard: (item: T) => ReactNode;
  emptyLabel?: string;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const activeItem = items.find((i) => i.id === activeId) ?? null;

  function handleStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const item = items.find((i) => i.id === String(active.id));
    if (!item) return;
    const toColumn = String(over.id);
    if (item.column === toColumn) return;
    onMove(item, toColumn);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleStart}
      onDragEnd={handleEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <Column
            key={col.id}
            column={col}
            items={items.filter((i) => i.column === col.id)}
            renderCard={renderCard}
            emptyLabel={emptyLabel}
            activeId={activeId}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <div className="w-72 rotate-2 opacity-90">{renderCard(activeItem)}</div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column<T extends KanbanItem>({
  column,
  items,
  renderCard,
  emptyLabel,
  activeId,
}: {
  column: KanbanColumn;
  items: T[];
  renderCard: (item: T) => ReactNode;
  emptyLabel: string;
  activeId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-3 flex items-center gap-2 px-1">
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: column.accent ?? "var(--ll-text-dim)" }}
        />
        <span
          className="text-[11px] uppercase tracking-[0.15em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-muted)" }}
        >
          {column.label}
        </span>
        <span
          className="ml-auto text-[11px]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
        >
          {items.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className="flex min-h-[60vh] flex-1 flex-col gap-2 rounded-xl border border-dashed p-2 transition-colors"
        style={{
          borderColor: isOver ? "var(--ll-accent)" : "var(--ll-border)",
          background: isOver ? "var(--ll-accent-dim)" : "var(--ll-surface)",
        }}
      >
        {items.length === 0 ? (
          <div
            className="flex flex-1 items-center justify-center py-8 text-center text-[11px]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
          >
            {emptyLabel}
          </div>
        ) : (
          items.map((item) => (
            <Card key={item.id} id={item.id} dimmed={activeId === item.id}>
              {renderCard(item)}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function Card({
  id,
  children,
  dimmed,
}: {
  id: string;
  children: ReactNode;
  dimmed: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="touch-none"
      style={{ opacity: isDragging || dimmed ? 0.4 : 1, cursor: "grab" }}
    >
      {children}
    </div>
  );
}
