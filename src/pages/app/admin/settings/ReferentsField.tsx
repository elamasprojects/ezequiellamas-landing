import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AspirationalReferent } from "@/lib/api/creatorProfile";

const MAX_REFERENTS = 3;

// Repeater for the 2-3 aspirational referents (transcript 3.2): name + what I
// like + why I want similar content.
export default function ReferentsField({
  value,
  onChange,
}: {
  value: AspirationalReferent[];
  onChange: (next: AspirationalReferent[]) => void;
}) {
  function update(i: number, patch: Partial<AspirationalReferent>) {
    onChange(value.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function add() {
    if (value.length >= MAX_REFERENTS) return;
    onChange([...value, { name: "", what_i_like: "", why: "" }]);
  }
  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-3">
      {value.map((ref, i) => (
        <div
          key={i}
          className="space-y-3 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4"
        >
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] uppercase tracking-[0.25em]"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
            >
              Referente {i + 1}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => remove(i)}
              className="h-7 w-7 text-[var(--ll-text-muted)] hover:text-red-400"
              aria-label="Quitar referente"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Input
            placeholder="Nombre (ej: Alex Hormozi)"
            value={ref.name}
            onChange={(e) => update(i, { name: e.target.value })}
          />
          <Textarea
            placeholder="Qué te gusta de su contenido"
            value={ref.what_i_like}
            onChange={(e) => update(i, { what_i_like: e.target.value })}
            rows={2}
          />
          <Textarea
            placeholder="Por qué querés un contenido similar al suyo"
            value={ref.why}
            onChange={(e) => update(i, { why: e.target.value })}
            rows={2}
          />
        </div>
      ))}

      {value.length < MAX_REFERENTS && (
        <Button variant="outline" onClick={add} type="button">
          <Plus className="h-4 w-4" /> Agregar referente
        </Button>
      )}
    </div>
  );
}
