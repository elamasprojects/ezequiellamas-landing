import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useScripts } from "@/hooks/useScripts";
import type { Script } from "@/lib/api/scripts";
import { updateScript } from "@/lib/api/scripts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DEFAULT_SCHEDULED_HOUR = 18; // 18:00 ART
type View = "month" | "week";

/**
 * Content calendar. Read-only overview by default (monthly or weekly); clicking
 * a day opens a picker to schedule one of your unscheduled drafts on it.
 * `embedded` renders a compact version (dashboard card).
 */
export default function ContentCalendar({ embedded = false }: { embedded?: boolean }) {
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [pickerDay, setPickerDay] = useState<Date | null>(null);
  const qc = useQueryClient();

  const { data: drafts = [] } = useScripts({ status: "draft" });
  const { data: scheduled = [] } = useScripts({ status: "scheduled" });

  const unscheduledDrafts = useMemo(() => drafts.filter((s) => !s.scheduled_at), [drafts]);

  const periodStart =
    view === "month"
      ? startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 })
      : startOfWeek(cursor, { weekStartsOn: 1 });
  const periodEnd =
    view === "month"
      ? endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 })
      : endOfWeek(cursor, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: periodStart, end: periodEnd });

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
      return updateScript(scriptId, { scheduled_at: target.toISOString(), status: "scheduled" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scripts"] });
      toast.success("Agendado");
      setPickerDay(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function shift(dir: 1 | -1) {
    setCursor((c) => (view === "month" ? addMonths(c, dir) : addDays(c, dir * 7)));
  }

  const title =
    view === "month"
      ? format(cursor, "MMMM yyyy", { locale: es }).replace(/^./, (c) => c.toUpperCase())
      : `${format(periodStart, "d MMM", { locale: es })} – ${format(periodEnd, "d MMM", { locale: es })}`;

  const maxPerCell = embedded ? 2 : 3;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2
          className={cn(embedded ? "text-lg" : "text-2xl")}
          style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}
        >
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {/* Month / week toggle */}
          <div className="flex overflow-hidden rounded-md border border-[var(--ll-border)]">
            {(["month", "week"] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className="px-2.5 py-1 text-xs transition-colors"
                style={{
                  background: view === v ? "var(--ll-accent-dim)" : "transparent",
                  color: view === v ? "var(--ll-accent)" : "var(--ll-text-muted)",
                }}
              >
                {v === "month" ? "Mes" : "Semana"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => shift(-1)} className="text-[var(--ll-text-muted)]" aria-label="Anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCursor(new Date())}
              className="border-[var(--ll-border)] text-[var(--ll-text-muted)]"
            >
              Hoy
            </Button>
            <Button variant="ghost" size="icon" onClick={() => shift(1)} className="text-[var(--ll-text-muted)]" aria-label="Siguiente">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
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
              inCurrentMonth={view === "week" || isSameMonth(day, cursor)}
              isToday={isToday(day)}
              scripts={scriptsByDay.get(format(day, "yyyy-MM-dd")) ?? []}
              compact={embedded}
              maxPerCell={maxPerCell}
              onPick={() => setPickerDay(day)}
            />
          ))}
        </div>
      </div>

      {/* Click-a-day → schedule a draft */}
      <Dialog open={pickerDay != null} onOpenChange={(o) => !o && setPickerDay(null)}>
        <DialogContent className="border-[var(--ll-border)] bg-[var(--ll-bg)] text-[var(--ll-text)]">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}>
              Agendar{pickerDay ? ` el ${format(pickerDay, "d 'de' MMMM", { locale: es })}` : ""}
            </DialogTitle>
          </DialogHeader>
          {unscheduledDrafts.length === 0 ? (
            <p className="py-2 text-sm" style={{ color: "var(--ll-text-muted)" }}>
              No tenés drafts sin agendar.{" "}
              <Link to="/app/admin/ideas/new" style={{ color: "var(--ll-accent)" }} onClick={() => setPickerDay(null)}>
                Generá una idea nueva
              </Link>
              .
            </p>
          ) : (
            <ul className="max-h-[50vh] space-y-2 overflow-y-auto py-1">
              {unscheduledDrafts.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={scheduleMutation.isPending}
                    onClick={() => pickerDay && scheduleMutation.mutate({ scriptId: s.id, date: pickerDay })}
                    className="flex w-full items-start gap-2 rounded-md border border-[var(--ll-border)] bg-[var(--ll-surface)] p-3 text-left transition-colors hover:border-[var(--ll-accent)]"
                  >
                    <Plus className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--ll-accent)" }} />
                    <div className="min-w-0">
                      <div className="truncate font-medium" style={{ color: "var(--ll-text)" }}>
                        {s.title || "Sin título"}
                      </div>
                      {s.hook && (
                        <p className="line-clamp-1 text-xs" style={{ color: "var(--ll-text-muted)" }}>
                          {s.hook}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px]" style={{ color: "var(--ll-text-dim)" }}>
            Se agenda a las 18:00 ART. Después podés ajustar la hora desde el guion.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CalendarCell({
  day,
  inCurrentMonth,
  isToday: today,
  scripts,
  compact,
  maxPerCell,
  onPick,
}: {
  day: Date;
  inCurrentMonth: boolean;
  isToday: boolean;
  scripts: Script[];
  compact: boolean;
  maxPerCell: number;
  onPick: () => void;
}) {
  return (
    <div
      onClick={onPick}
      className={cn(
        "group relative cursor-pointer border-b border-r border-[var(--ll-border)] p-1.5 text-xs transition-colors hover:bg-[var(--ll-accent)]/5",
        compact ? "min-h-[4.5rem]" : "min-h-24",
        !inCurrentMonth && "opacity-40",
      )}
      style={today ? { outline: "2px solid var(--ll-accent)", outlineOffset: "-2px" } : {}}
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
        {scripts.slice(0, maxPerCell).map((s) => (
          <li key={s.id}>
            <Link
              to={`/app/admin/ideas/${s.id}`}
              onClick={(e) => e.stopPropagation()}
              className="block truncate rounded bg-[var(--ll-surface-2)] px-1.5 py-0.5 text-[11px]"
              style={{ color: "var(--ll-text)" }}
              title={s.title ?? "Sin título"}
            >
              {s.title || "Sin título"}
            </Link>
          </li>
        ))}
        {scripts.length > maxPerCell && (
          <li className="px-1.5 text-[10px]" style={{ color: "var(--ll-text-muted)" }}>
            +{scripts.length - maxPerCell} más
          </li>
        )}
      </ul>
    </div>
  );
}
