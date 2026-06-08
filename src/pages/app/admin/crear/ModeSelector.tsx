import { Copy, Sparkles, Wand2 } from "lucide-react";

export type AdaptMode = "copy" | "voice" | "instructions";

const ADAPT_MODES: {
  value: AdaptMode;
  label: string;
  help: string;
  icon: typeof Copy;
}[] = [
  {
    value: "copy",
    label: "Copiar",
    help: "Replica la idea y estructura tal cual, traducida a tu español y limpia de relleno.",
    icon: Copy,
  },
  {
    value: "voice",
    label: "A mi voz",
    help: "Toma la idea como semilla y la reescribe entera con tu voz y tu perfil de marca.",
    icon: Sparkles,
  },
  {
    value: "instructions",
    label: "Con instrucciones",
    help: "Adapta la idea siguiendo las instrucciones puntuales que escribís abajo.",
    icon: Wand2,
  },
];

export default function ModeSelector({
  value,
  onChange,
  disabled,
}: {
  value: AdaptMode;
  onChange: (m: AdaptMode) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {ADAPT_MODES.map((m) => {
        const active = m.value === value;
        const Icon = m.icon;
        return (
          <button
            key={m.value}
            type="button"
            onClick={() => onChange(m.value)}
            disabled={disabled}
            className="flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors disabled:opacity-60"
            style={{
              borderColor: active ? "var(--ll-accent)" : "var(--ll-border)",
              background: active ? "var(--ll-accent-dim)" : "var(--ll-surface)",
            }}
          >
            <span className="flex items-center gap-2">
              <Icon className="h-4 w-4" style={{ color: active ? "var(--ll-accent)" : "var(--ll-text-muted)" }} />
              <span className="font-medium" style={{ color: "var(--ll-text)" }}>
                {m.label}
              </span>
            </span>
            <span className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
              {m.help}
            </span>
          </button>
        );
      })}
    </div>
  );
}
