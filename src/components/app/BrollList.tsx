import { Film } from "lucide-react";
import type { BrollSuggestion } from "@/lib/api/scripts";

interface Props {
  brolls: BrollSuggestion[];
}

export default function BrollList({ brolls }: Props) {
  if (brolls.length === 0) {
    return (
      <p className="text-sm italic" style={{ color: "var(--ll-text-dim)" }}>
        Sin B-rolls sugeridos.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {brolls.map((b, i) => (
        <li
          key={b.id}
          className="flex gap-3 rounded-md border border-[var(--ll-border)] bg-[var(--ll-surface-2)] p-3"
        >
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded"
            style={{ background: "var(--ll-accent-dim)", color: "var(--ll-accent)" }}
          >
            <span className="text-xs font-mono">{i + 1}</span>
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm" style={{ color: "var(--ll-text)" }}>
              <Film className="mr-1.5 inline h-3 w-3" style={{ color: "var(--ll-accent)" }} />
              {b.suggestion}
            </p>
            {b.cue_text && (
              <p
                className="text-xs italic"
                style={{ color: "var(--ll-text-muted)" }}
              >
                cuando: "{b.cue_text}"
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
