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
import { ArrowLeft, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScheduledPosts } from "@/hooks/useScheduledPosts";
import type { ScheduledPostWithJobs } from "@/lib/api/scheduledPosts";
import { PublishStatusPill } from "@/components/publishing/PublishStatusPill";
import { PlatformBadge } from "@/components/publishing/PlatformBadge";
import { cn } from "@/lib/utils";
import type { PublishPlatform } from "@/lib/publishing/platformLimits";

export default function PublishingCalendar() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const { data: posts = [] } = useScheduledPosts({
    from: calendarStart.toISOString(),
    to: calendarEnd.toISOString(),
  });

  const postsByDay = useMemo(() => {
    const map = new Map<string, ScheduledPostWithJobs[]>();
    for (const p of posts) {
      const key = format(new Date(p.scheduled_at), "yyyy-MM-dd");
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    return map;
  }, [posts]);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-[var(--ll-text-muted)]">
          <Link to="/app/admin/publishing">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div
              className="text-[10px] uppercase tracking-[0.25em]"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
            >
              Calendario
            </div>
            <h1
              className="text-2xl md:text-3xl"
              style={{
                fontFamily: "'Instrument Serif', serif",
                letterSpacing: "-0.025em",
                lineHeight: 1.1,
              }}
            >
              Publicaciones <em style={{ color: "var(--ll-warm)" }}>programadas</em>
            </h1>
          </div>
          <Button asChild variant="brand" size="sm">
            <Link to="/app/admin/publishing/new">
              <Plus className="h-4 w-4" /> Nuevo
            </Link>
          </Button>
        </div>
      </header>

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
            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const items = postsByDay.get(dateStr) ?? [];
              const inMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "relative min-h-28 border-b border-r border-[var(--ll-border)] p-1.5 text-xs",
                    !inMonth && "opacity-40",
                  )}
                  style={
                    today
                      ? { outline: "2px solid var(--ll-accent)", outlineOffset: "-2px" }
                      : undefined
                  }
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
                    {items.slice(0, 3).map((p) => (
                      <li key={p.id}>
                        <Link
                          to={`/app/admin/publishing/${p.id}`}
                          className="block space-y-1 rounded bg-[var(--ll-surface-2)] p-1"
                        >
                          <div className="flex items-center gap-1">
                            {p.publish_jobs.slice(0, 3).map((j) => (
                              <PlatformBadge
                                key={j.id}
                                platform={j.platform as PublishPlatform}
                                size="xs"
                                iconOnly
                              />
                            ))}
                          </div>
                          <div
                            className="truncate text-[10px]"
                            style={{ color: "var(--ll-text)" }}
                            title={p.title ?? "Sin título"}
                          >
                            {p.title || "(sin título)"}
                          </div>
                          <PublishStatusPill status={p.status} className="text-[9px] px-1.5 py-0" />
                        </Link>
                      </li>
                    ))}
                    {items.length > 3 && (
                      <li
                        className="px-1 text-[10px]"
                        style={{ color: "var(--ll-text-muted)" }}
                      >
                        +{items.length - 3} más
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
