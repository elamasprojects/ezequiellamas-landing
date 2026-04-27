import { useEffect, useState } from "react";
import type { T5CTAContent } from "@/lib/carousel/types";
import {
  TextField,
  TextareaField,
  StringListField,
} from "./EditorShared";

interface Props {
  value: T5CTAContent;
  onChange: (next: T5CTAContent) => void;
}

export default function T5CTAEditor({ value, onChange }: Props) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);

  function patch(partial: Partial<T5CTAContent>) {
    const next = { ...v, ...partial };
    setV(next);
    onChange(next);
  }

  return (
    <div className="space-y-5">
      <TextField
        label="Headline (uppercase, sin markdown)"
        hint='Ej. COMENTÁ "X" ABAJO Y TE LO MANDO POR DM'
        value={v.headline}
        onChange={(s) => patch({ headline: s.toUpperCase() })}
        maxLength={100}
      />
      <TextareaField
        label="Subtítulo"
        markdown
        value={v.subtitle}
        onChange={(s) => patch({ subtitle: s })}
        maxLength={240}
        rows={3}
      />
      <TextField
        label="Keyword"
        hint="Una palabra. Aparece GIGANTE en serif italic accent + glow."
        value={v.keyword}
        onChange={(s) => patch({ keyword: s.toUpperCase().replace(/\s+/g, "") })}
        maxLength={20}
        mono
      />
      <StringListField
        label="Tags (exactamente 4)"
        hint="Mono pill accent. Categorías que el carrusel cubre."
        values={v.tags}
        onChange={(arr) => patch({ tags: arr })}
        minItems={4}
        maxItems={4}
        itemMaxLength={16}
      />
      <TextareaField
        label="Signature text"
        markdown
        hint="Tagline al pie del card de signature."
        value={v.signatureText}
        onChange={(s) => patch({ signatureText: s })}
        maxLength={120}
        rows={2}
      />
    </div>
  );
}
