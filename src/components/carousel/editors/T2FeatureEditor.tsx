import { useEffect, useState } from "react";
import type { T2FeatureContent } from "@/lib/carousel/types";
import {
  TextField,
  TextareaField,
  TypedBulletList,
  PriceRowEditor,
} from "./EditorShared";

interface Props {
  value: T2FeatureContent;
  onChange: (next: T2FeatureContent) => void;
}

export default function T2FeatureEditor({ value, onChange }: Props) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);

  function patch(partial: Partial<T2FeatureContent>) {
    const next = { ...v, ...partial };
    setV(next);
    onChange(next);
  }

  return (
    <div className="space-y-5">
      <TextField
        label="Label"
        hint="Mono accent. Ej. PARTE 01, DATO 02, TOOL 01"
        value={v.partLabel}
        onChange={(s) => patch({ partLabel: s })}
        maxLength={24}
        mono
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Icon (mini logo)"
          hint="1-2 chars (opcional)"
          value={v.iconText ?? ""}
          onChange={(s) => patch({ iconText: s || undefined })}
          maxLength={4}
          mono
        />
        <TextField
          label="Title (concepto)"
          hint="Nombre del concepto/herramienta (opcional)"
          value={v.title ?? ""}
          onChange={(s) => patch({ title: s || undefined })}
          maxLength={60}
        />
      </div>
      <PriceRowEditor
        values={v.priceRow ?? []}
        onChange={(arr) => patch({ priceRow: arr.length ? arr : undefined })}
      />
      <TextareaField
        label="Texto contextual"
        markdown
        hint="1-2 líneas, opcional. El dolor que resuelve."
        value={v.contextText ?? ""}
        onChange={(s) => patch({ contextText: s || undefined })}
        maxLength={280}
        rows={3}
      />
      <TextField
        label="Card header"
        hint='Mono accent. Ej. "> LO QUE NO ESCALA"'
        value={v.cardHeader}
        onChange={(s) => patch({ cardHeader: s })}
        maxLength={50}
        mono
      />
      <TextareaField
        label="Card title"
        markdown
        hint="Envolvé palabra clave en *texto* para serif punch."
        value={v.cardTitle}
        onChange={(s) => patch({ cardTitle: s })}
        maxLength={120}
        rows={2}
      />
      <TypedBulletList
        label="Bullets de la card"
        hint="3-6 items. > para positivos accent, x para negativos rojos."
        values={v.cardBullets}
        onChange={(arr) => patch({ cardBullets: arr })}
        minItems={3}
        maxItems={6}
      />
    </div>
  );
}
