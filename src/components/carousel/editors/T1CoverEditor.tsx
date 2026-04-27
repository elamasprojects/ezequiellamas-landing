import { useEffect, useState } from "react";
import type { T1CoverContent } from "@/lib/carousel/types";
import {
  TextField,
  TextareaField,
  StringListField,
} from "./EditorShared";

interface Props {
  value: T1CoverContent;
  onChange: (next: T1CoverContent) => void;
}

export default function T1CoverEditor({ value, onChange }: Props) {
  // Keep local state in sync with incoming value (from re-generate, etc.)
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);

  function patch(partial: Partial<T1CoverContent>) {
    const next = { ...v, ...partial };
    setV(next);
    onChange(next);
  }

  return (
    <div className="space-y-5">
      <TextField
        label="Mascot icon"
        hint="1-3 chars o emoji-like (ej. >_, $$, !!)"
        value={v.mascotIcon ?? ""}
        onChange={(s) => patch({ mascotIcon: s })}
        placeholder=">_"
        maxLength={6}
        mono
      />
      <TextField
        label="Headline línea 1"
        hint="Sans bold blanco"
        value={v.headlineLine1}
        onChange={(s) => patch({ headlineLine1: s })}
        placeholder="100 clientes en 3 meses."
        maxLength={80}
      />
      <TextField
        label="Frase puñal (línea 2)"
        hint="Serif italic accent + glow. 1-3 palabras de bandera."
        value={v.headlineLine2Punch}
        onChange={(s) => patch({ headlineLine2Punch: s })}
        placeholder="Sin pagar fees."
        maxLength={40}
      />
      <TextareaField
        label="Subtítulo"
        markdown
        value={v.subtitle}
        onChange={(s) => patch({ subtitle: s })}
        placeholder="Te muestro **el sistema** que arme para escribir scripts UGC al toque."
        maxLength={280}
        rows={3}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Comparación 'antes'"
          hint="Aparece tachado (opcional)"
          value={v.comparisonOld ?? ""}
          onChange={(s) => patch({ comparisonOld: s || undefined })}
          placeholder="$30/mes"
          maxLength={60}
        />
        <TextField
          label="Comparación 'después'"
          hint="Pill accent (opcional)"
          value={v.comparisonNew ?? ""}
          onChange={(s) => patch({ comparisonNew: s || undefined })}
          placeholder="$0 con tu propio stack"
          maxLength={60}
        />
      </div>
      <StringListField
        label="Preview chips (hasta 4)"
        hint="Categorías que el carrusel cubre, en mono"
        values={v.previewChips ?? []}
        onChange={(arr) => patch({ previewChips: arr.length ? arr : undefined })}
        placeholder="AGENT 01"
        maxItems={4}
        itemMaxLength={24}
      />
    </div>
  );
}
