import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clock, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useSession } from "@/hooks/useSession";
import { usePublishingSlots } from "@/hooks/usePublishingSlots";
import {
  createPublishingSlot,
  deletePublishingSlot,
  seedDefaultPublishingSlots,
  WEEKDAYS,
} from "@/lib/api/publishingSlots";

function hhmm(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export default function PublishingSlots() {
  const { user } = useSession();
  const qc = useQueryClient();
  const { data: slots, isLoading } = usePublishingSlots();

  const [weekday, setWeekday] = useState(1);
  const [time, setTime] = useState("19:00");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["publishing-slots"] });

  const add = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("not authenticated");
      const [h, m] = time.split(":").map((n) => parseInt(n, 10));
      return createPublishingSlot(user.id, { weekday, hour: h, minute: m || 0 });
    },
    onSuccess: () => { invalidate(); toast.success("Horario agregado"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: deletePublishingSlot,
    onSuccess: () => { invalidate(); toast.success("Horario eliminado"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const seed = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("not authenticated");
      return seedDefaultPublishingSlots(user.id);
    },
    onSuccess: () => { invalidate(); toast.success("Cargué los horarios sugeridos"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-2xl space-y-8">
      <Link to="/app/admin/publishing" className="inline-flex items-center gap-1 text-sm" style={{ color: "var(--ll-text-muted)" }}>
        <ArrowLeft className="h-4 w-4" /> Publicaciones
      </Link>

      <header className="space-y-2">
        <div className="text-[10px] uppercase tracking-[0.25em]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}>
          Horarios óptimos
        </div>
        <h1 className="text-3xl" style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}>
          Tus <em style={{ color: "var(--ll-warm)" }}>mejores horas</em> para publicar
        </h1>
        <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
          Estos bloques se usan para sugerirte el próximo slot óptimo al programar (y para saltear los
          que ya tenés ocupados). Editalos a gusto.
        </p>
      </header>

      {/* Add */}
      <section className="flex flex-wrap items-end gap-3 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4">
        <div className="space-y-1">
          <Label>Día</Label>
          <select
            value={weekday}
            onChange={(e) => setWeekday(parseInt(e.target.value, 10))}
            className="block rounded-md border border-[var(--ll-border)] bg-[var(--ll-surface-2)] px-3 py-2 text-sm"
            style={{ color: "var(--ll-text)" }}
          >
            {WEEKDAYS.map((w, i) => <option key={i} value={i}>{w}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Hora</Label>
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-32" />
        </div>
        <Button variant="brand" onClick={() => add.mutate()} disabled={add.isPending}>
          <Plus className="h-4 w-4" /> Agregar
        </Button>
      </section>

      {/* List */}
      <section className="space-y-3">
        {isLoading ? (
          <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>Cargando…</p>
        ) : !slots || slots.length === 0 ? (
          <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-8 text-center">
            <Clock className="mx-auto mb-3 h-6 w-6" style={{ color: "var(--ll-accent)" }} />
            <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
              Todavía no tenés horarios. Cargá un set sugerido y editalo.
            </p>
            <Button variant="brand" className="mt-4" onClick={() => seed.mutate()} disabled={seed.isPending}>
              <Sparkles className="h-4 w-4" /> Cargar horarios sugeridos
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {slots.map((s) => (
              <li key={s.id} className="flex items-center gap-3 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-3">
                <span className="w-12 text-sm font-medium" style={{ color: "var(--ll-accent)" }}>{WEEKDAYS[s.weekday]}</span>
                <span className="flex-1 text-sm" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text)" }}>
                  {hhmm(s.hour, s.minute)}
                </span>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--ll-text-muted)] hover:text-red-400" onClick={() => del.mutate(s.id)} aria-label="Borrar">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
