import { useEffect, useState } from "react";
import type { T3GridContent, T3GridCard } from "@/lib/carousel/types";
import { TextField, TextareaField, FieldLabel } from "./EditorShared";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const VALID_BADGES = ["//", "KB", "MD", "$0", "DB", "TX", "%%", ">_", "RD"];

interface Props {
  value: T3GridContent;
  onChange: (next: T3GridContent) => void;
}

export default function T3GridEditor({ value, onChange }: Props) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);

  function patch(partial: Partial<T3GridContent>) {
    const next = { ...v, ...partial };
    setV(next);
    onChange(next);
  }

  function patchCard(i: number, partial: Partial<T3GridCard>) {
    const next = [...v.cards];
    next[i] = { ...next[i], ...partial } as T3GridCard;
    patch({ cards: next });
  }

  return (
    <div className="space-y-5">
      <TextField
        label="Label"
        hint="Mono accent. Ej. PARTE 02"
        value={v.partLabel}
        onChange={(s) => patch({ partLabel: s })}
        maxLength={24}
        mono
      />
      <TextField
        label="Headline (línea blanca)"
        hint="Sans bold blanco"
        value={v.headlineMain}
        onChange={(s) => patch({ headlineMain: s })}
        maxLength={80}
      />
      <TextField
        label="Headline (línea accent)"
        hint="Accent o frase puñal en *texto*. Markdown allowed."
        value={v.headlineAccent}
        onChange={(s) => patch({ headlineAccent: s })}
        maxLength={80}
      />

      <div className="space-y-3">
        <FieldLabel hint="Exactamente 4 cards. Badge sugeridos abajo de cada uno.">
          Cards (2x2)
        </FieldLabel>
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => {
            const card = v.cards[i] ?? { badge: "", title: "", description: "" };
            return (
              <div
                key={i}
                className="space-y-2 rounded-md border border-[var(--ll-border)] bg-[var(--ll-surface-2)] p-3"
              >
                <div className="flex items-center gap-2">
                  <Input
                    value={card.badge}
                    onChange={(e) => patchCard(i, { badge: e.target.value })}
                    maxLength={6}
                    placeholder="//"
                    className="h-8 w-16 border-[var(--ll-border)] bg-[var(--ll-surface)] text-center text-xs text-[var(--ll-text)]"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  />
                  <span
                    className="text-[10px] uppercase tracking-[0.15em]"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      color: "var(--ll-text-dim)",
                    }}
                  >
                    Card {i + 1}
                  </span>
                </div>
                <Input
                  value={card.title}
                  onChange={(e) => patchCard(i, { title: e.target.value })}
                  maxLength={60}
                  placeholder="Título corto"
                  className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]"
                />
                <Textarea
                  value={card.description}
                  onChange={(e) => patchCard(i, { description: e.target.value })}
                  maxLength={140}
                  rows={2}
                  placeholder="Descripción 1 línea (markdown allowed)"
                  className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]"
                />
              </div>
            );
          })}
        </div>
        <div
          className="text-[10px]"
          style={{
            color: "var(--ll-text-dim)",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          BADGES: {VALID_BADGES.join(" · ")}
        </div>
      </div>

      <TextareaField
        label="Callout de cierre"
        markdown
        hint="Pill accent. Mejor con número concreto."
        value={v.callout}
        onChange={(s) => patch({ callout: s })}
        maxLength={200}
        rows={2}
      />
    </div>
  );
}
