import { useMemo, useState } from "react";
import { Calendar, FileText, Loader2, Search, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useScripts } from "@/hooks/useScripts";
import type { Script, ScriptStatus } from "@/lib/api/scripts";

/** Estados de guion entre los que se puede elegir un script asociado. */
const PICKER_STATUSES: ScriptStatus[] = ["draft", "scheduled", "recorded"];

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  scheduled: "Agendado",
  recorded: "Grabado",
};

/** Color del badge por estado (usa las CSS vars de la landing/app). */
const STATUS_COLOR: Record<string, string> = {
  draft: "var(--ll-text-muted)",
  scheduled: "var(--ll-warm)",
  recorded: "var(--ll-accent)",
};

interface ScriptPickerProps {
  value: string | null;
  onChange: (id: string | null) => void;
}

/**
 * Selector de guion asociado. Reemplaza el input de UUID por un botón que abre
 * un modal con buscador (título o contenido), filtro por estado y por fecha.
 */
export function ScriptPicker({ value, onChange }: ScriptPickerProps) {
  const [open, setOpen] = useState(false);
  // Sólo buscamos los guiones en estados elegibles (draft/scheduled/recorded).
  const { data: scripts, isLoading } = useScripts({ statuses: PICKER_STATUSES });

  const selected = useMemo(
    () => scripts?.find((s) => s.id === value) ?? null,
    [scripts, value],
  );

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md border bg-[var(--ll-surface)] px-3 text-left text-sm transition-colors hover:border-[var(--ll-border-hover)]"
          style={{ borderColor: "var(--ll-border)" }}
        >
          <FileText className="h-4 w-4 shrink-0" style={{ color: "var(--ll-text-dim)" }} />
          {selected ? (
            <span className="truncate" style={{ color: "var(--ll-text)" }}>
              {selected.title || "Sin título"}
            </span>
          ) : value ? (
            // El guion seleccionado no está en la lista cargada (raro): mostrar id.
            <span className="truncate" style={{ color: "var(--ll-text-muted)" }}>
              {value}
            </span>
          ) : (
            <span className="truncate" style={{ color: "var(--ll-text-muted)" }}>
              Elegir un guion…
            </span>
          )}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            title="Quitar guion"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border transition-colors hover:border-[var(--ll-border-hover)]"
            style={{ borderColor: "var(--ll-border)", color: "var(--ll-text-muted)" }}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <ScriptPickerDialog
        open={open}
        onOpenChange={setOpen}
        scripts={scripts ?? []}
        isLoading={isLoading}
        selectedId={value}
        onSelect={(id) => {
          onChange(id);
          setOpen(false);
        }}
      />
    </>
  );
}

function ScriptPickerDialog({
  open,
  onOpenChange,
  scripts,
  isLoading,
  selectedId,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scripts: Script[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ScriptStatus | "all">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const hasFilters = search.trim() !== "" || statusFilter !== "all" || from !== "" || to !== "";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scripts.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (from && localDay(s.created_at) < from) return false;
      if (to && localDay(s.created_at) > to) return false;
      if (q && !matchesContent(s, q)) return false;
      return true;
    });
  }, [scripts, search, statusFilter, from, to]);

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setFrom("");
    setTo("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl gap-0 overflow-hidden border-[var(--ll-border)] bg-[var(--ll-bg)] p-0"
      >
        <DialogHeader className="space-y-3 border-b border-[var(--ll-border)] p-4">
          <DialogTitle
            className="text-left text-lg"
            style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}
          >
            Elegir guion asociado
          </DialogTitle>

          {/* Buscador por título o contenido */}
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: "var(--ll-text-dim)" }}
            />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título o contenido…"
              className="h-10 w-full rounded-md border bg-[var(--ll-surface)] pl-9 pr-3 text-sm focus:outline-none focus:ring-1"
              style={{ borderColor: "var(--ll-border)", color: "var(--ll-text)" }}
            />
          </div>

          {/* Filtros: estado + fecha */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <FilterLabel>Estado</FilterLabel>
              <div className="flex flex-wrap gap-1">
                <StatusChip
                  active={statusFilter === "all"}
                  label="Todos"
                  onClick={() => setStatusFilter("all")}
                />
                {PICKER_STATUSES.map((st) => (
                  <StatusChip
                    key={st}
                    active={statusFilter === st}
                    label={STATUS_LABEL[st]}
                    onClick={() => setStatusFilter(st)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <FilterLabel>Desde</FilterLabel>
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
                className="h-8 rounded-md border bg-[var(--ll-surface)] px-2 text-xs focus:outline-none focus:ring-1"
                style={{ borderColor: "var(--ll-border)", color: "var(--ll-text)" }}
              />
            </div>
            <div className="space-y-1">
              <FilterLabel>Hasta</FilterLabel>
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
                className="h-8 rounded-md border bg-[var(--ll-surface)] px-2 text-xs focus:outline-none focus:ring-1"
                style={{ borderColor: "var(--ll-border)", color: "var(--ll-text)" }}
              />
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="ml-auto text-[11px] hover:underline"
                style={{ color: "var(--ll-text-muted)" }}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </DialogHeader>

        {/* Lista de guiones */}
        <div className="max-h-[55vh] min-h-[200px] overflow-y-auto p-2">
          {isLoading ? (
            <div
              className="flex items-center justify-center gap-2 py-12 text-sm"
              style={{ color: "var(--ll-text-muted)" }}
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando guiones…
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-12 text-center text-sm" style={{ color: "var(--ll-text-muted)" }}>
              <FileText className="mx-auto mb-2 h-5 w-5" style={{ color: "var(--ll-text-dim)" }} />
              {scripts.length === 0
                ? "No tenés guiones en draft, agendados ni grabados."
                : "Ningún guion coincide con los filtros."}
            </div>
          ) : (
            <ul className="space-y-1">
              {filtered.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(s.id)}
                    className="flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-colors hover:border-[var(--ll-border-hover)]"
                    style={{
                      borderColor:
                        s.id === selectedId ? "var(--ll-accent)" : "transparent",
                      background:
                        s.id === selectedId ? "var(--ll-accent-dim)" : "var(--ll-surface)",
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium" style={{ color: "var(--ll-text)" }}>
                          {s.title || "Sin título"}
                        </span>
                      </div>
                      {(s.hook || s.raw_concept) && (
                        <p className="mt-0.5 line-clamp-2 text-xs" style={{ color: "var(--ll-text-muted)" }}>
                          {s.hook || s.raw_concept}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <StatusBadge status={s.status} />
                      <span
                        className="flex items-center gap-1 text-[10px]"
                        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
                      >
                        <Calendar className="h-2.5 w-2.5" />
                        {new Date(s.created_at).toLocaleDateString("es-AR", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="block text-[9px] uppercase tracking-[0.15em]"
      style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
    >
      {children}
    </span>
  );
}

function StatusChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border px-2.5 py-1 text-xs transition-colors"
      style={{
        borderColor: active ? "var(--ll-accent)" : "var(--ll-border)",
        background: active ? "var(--ll-accent-dim)" : "transparent",
        color: active ? "var(--ll-accent)" : "var(--ll-text-muted)",
      }}
    >
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? "var(--ll-text-muted)";
  return (
    <span
      className="rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em]"
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        color,
        borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
      }}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

/** YYYY-MM-DD en hora local, para comparar contra los <input type="date">. */
function localDay(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** ¿El guion matchea la query buscando en título + campos de contenido? */
function matchesContent(s: Script, q: string): boolean {
  const haystack = [
    s.title,
    s.hook,
    s.development,
    s.cta,
    s.generated_script,
    s.raw_concept,
    s.caption,
    s.ai_summary,
    s.on_screen_text,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}
