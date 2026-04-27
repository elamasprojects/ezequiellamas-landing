import { useEffect, useState } from "react";
import type { T4VSContent } from "@/lib/carousel/types";
import {
  TextField,
  TextareaField,
  StringListField,
} from "./EditorShared";

interface Props {
  value: T4VSContent;
  onChange: (next: T4VSContent) => void;
}

export default function T4VSEditor({ value, onChange }: Props) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);

  function patch(partial: Partial<T4VSContent>) {
    const next = { ...v, ...partial };
    setV(next);
    onChange(next);
  }

  return (
    <div className="space-y-5">
      <TextField
        label="Label"
        value={v.partLabel}
        onChange={(s) => patch({ partLabel: s })}
        maxLength={24}
        mono
      />
      <TextareaField
        label="Headline"
        markdown
        value={v.headline}
        onChange={(s) => patch({ headline: s })}
        maxLength={160}
        rows={2}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* LEFT */}
        <div className="space-y-4 rounded-md border border-[var(--ll-border)] bg-[var(--ll-surface-2)] p-3">
          <div
            className="text-[10px] uppercase tracking-[0.18em]"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: "var(--ll-text-muted)",
            }}
          >
            Columna izquierda — problema
          </div>
          <TextField
            label="Label izquierdo"
            hint='Ej. "LO QUE PAGÁS" / "CÓMO LO HACEN"'
            value={v.leftLabel}
            onChange={(s) => patch({ leftLabel: s })}
            maxLength={30}
            mono
          />
          <TextField
            label="Title izquierdo"
            value={v.leftTitle}
            onChange={(s) => patch({ leftTitle: s })}
            maxLength={60}
          />
          <StringListField
            label="Bullets (con x rojos)"
            values={v.leftBullets}
            onChange={(arr) => patch({ leftBullets: arr })}
            minItems={3}
            maxItems={6}
            itemMaxLength={80}
          />
          <StringListField
            label="Footer lines (opcional)"
            hint="Mono bold. Ej. TOTAL: $X"
            values={v.leftFooterLines ?? []}
            onChange={(arr) =>
              patch({ leftFooterLines: arr.length ? arr : undefined })
            }
            maxItems={3}
            itemMaxLength={50}
          />
        </div>

        {/* RIGHT */}
        <div className="space-y-4 rounded-md border border-[var(--ll-accent)]/30 bg-[var(--ll-accent)]/5 p-3">
          <div
            className="text-[10px] uppercase tracking-[0.18em]"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: "var(--ll-accent)",
            }}
          >
            Columna derecha — solución
          </div>
          <TextField
            label="Label derecho"
            hint='Ej. "[TU APROACH]" / "MI SISTEMA"'
            value={v.rightLabel}
            onChange={(s) => patch({ rightLabel: s })}
            maxLength={30}
            mono
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Title prefix (sans)"
              hint='Ej. "Construir"'
              value={v.rightTitlePrefix}
              onChange={(s) => patch({ rightTitlePrefix: s })}
              maxLength={40}
            />
            <TextField
              label="Title punch (serif italic)"
              hint='Ej. "lo tuyo"'
              value={v.rightTitlePunch}
              onChange={(s) => patch({ rightTitlePunch: s })}
              maxLength={40}
            />
          </div>
          <StringListField
            label="Bullets (con > accent)"
            values={v.rightBullets}
            onChange={(arr) => patch({ rightBullets: arr })}
            minItems={3}
            maxItems={6}
            itemMaxLength={80}
          />
          <StringListField
            label="Footer lines (opcional)"
            hint="Mono accent."
            values={v.rightFooterLines ?? []}
            onChange={(arr) =>
              patch({ rightFooterLines: arr.length ? arr : undefined })
            }
            maxItems={3}
            itemMaxLength={50}
          />
        </div>
      </div>
    </div>
  );
}
