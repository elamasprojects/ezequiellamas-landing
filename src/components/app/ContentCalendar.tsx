import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { useScripts } from "@/hooks/useScripts";
import type { Script } from "@/lib/api/scripts";
import { updateScript } from "@/lib/api/scripts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DEFAULT_SCHEDULED_HOUR = 18; // 18:00 ART

export default function ContentCalendar() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const qc = useQueryClient();

  const { data: drafts = [] } = useScripts({ status: "draft" });
  const { data: scheduled = [] } = useScripts({ status: "scheduled" });

  const unscheduledDrafts = useMemo(
    () => drafts.filter((s) => !s.scheduled_at),
    [drafts],
  );

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const scriptsByDay = useMemo(() => {
    const map = new Map<string, Script[]>();
    for (const s of scheduled) {
      if (!s.scheduled_at) continue;
      const key = format(new Date(s.scheduled_at), "yyyy-MM-dd");
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return map;
  }, [scheduled]);

  const scheduleMutation = useMutation({
    mutationFn: ({ scriptId, date }: { scriptId: string; date: Date }) => {
      const target = new Date(date);
      target.setHours(DEFAULT_SCHEDULED_HOUR, 0, 0, 0);
      return updateScript(scriptId, {
        scheduled_at: target.toISOString(),
        status: "scheduled",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scripts"] });
      toast.success("Agendado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    const scriptId = String(active.id);
    const dateStr = String(over.id); // yyyy-MM-dd
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    scheduleMutation.mutate({ scriptId, date });
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <header className="flex items-center justify-between gap-3">
            <h2
              className="text-2xl"
              style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}
            >
              {format(currentMonth, "MMMM yyyy", { locale: es }).replace(/^./, (c) => c.toUpperCase())}
            </h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="text-[var(--ll-text-muted)]"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date())}
                className="border-[var(--ll-border)] text-[var(--ll-text-muted)]"
              >
                Hoy
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="text-[var(--ll-text-muted)]"
                aria-label="Mes siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <div className="overflow-hidden rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)]">
            <div className="grid grid-cols-7 border-b border-[var(--ll-border)] text-center">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                <div
                  key={d}
                  className="py-2 text-[10px] uppercase tracking-[0.15em]"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-muted)" }}
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day) => (
                <CalendarCell
                  key={day.toISOString()}
                  day={day}
                  inCurrentMonth={isSameMonth(day, currentMonth)}
                  isToday={isToday(day)}
                  scripts={scriptsByDay.get(format(day, "yyyy-MM-dd")) ?? []}
                />
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-3">
          <div
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-warm)" }}
          >
            Drafts sin agendar
          </div>
          {unscheduledDrafts.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
              No tenés drafts sueltos. Generá una idea nueva en{" "}
              <Link to="/app/admin/ideas/new" style={{ color: "var(--ll-accent)" }}>
                Idea → Guion
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-2">
              {unscheduledDrafts.map((s) => (
                <DraggableScript key={s.id} script={s} />
              ))}
            </ul>
          )}
        </aside>
      </div>
    </DndContext>
  );
}

function CalendarCell({
  day,
  inCurrentMonth,
  isToday: today,
  scripts,
}: {
  day: Date;
  inCurrentMonth: boolean;
  isToday: boolean;
  scripts: Script[];
}) {
  const dateStr = format(day, "yyyy-MM-dd");
  const { setNodeRef, isOver } = useDroppable({ id: dateStr });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative min-h-24 border-b border-r border-[var(--ll-border)] p-1.5 text-xs",
        !inCurrentMonth && "opacity-40",
        isOver && "bg-[var(--ll-accent)]/10",
      )}
      style={{
        ...(today
          ? {
              outline: "2px solid var(--ll-accent)",
              outlineOffset: "-2px",
            }
          : {}),
      }}
    >
      <div
        className="mb-1 flex justify-end text-[10px]"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          color: today ? "var(--ll-accent)" : "var(--ll-text-muted)",
          fontWeight: today ? 700 : 400,
        }}
      >
        {format(day, "d")}
      </div>
      <ul className="space-y-1">
        {scripts.slice(0, 3).map((s) => (
          <li key={s.id}>
            <Link
              to={`/app/admin/ideas/${s.id}`}
              className="block truncate rounded bg-[var(--ll-surface-2)] px-1.5 py-0.5 text-[11px]"
              style={{ color: "var(--ll-text)" }}
              title={s.title ?? "Sin título"}
            >
              {s.title || "Sin título"}
            </Link>
          </li>
        ))}
        {scripts.length > 3 && (
          <li
            className="px-1.5 text-[10px]"
            style={{ color: "var(--ll-text-muted)" }}
          >
            +{scripts.length - 3} más
          </li>
        )}
      </ul>
    </div>
  );
}

function DraggableScript({ script }: { script: Script }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: script.id });

  return (
    <li
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab touch-none rounded-md border border-[var(--ll-border)] bg-[var(--ll-surface)] p-3 text-sm transition-colors active:cursor-grabbing",
        isDragging && "opacity-50",
      )}
      style={{ color: "var(--ll-text)" }}
    >
      <div className="font-medium truncate">{script.title || "Sin título"}</div>
      {script.hook && (
        <p
          className="mt-1 line-clamp-2 text-xs"
          style={{ color: "var(--ll-text-muted)" }}
        >
          {script.hook}
        </p>
      )}
    </li>
  );
}
