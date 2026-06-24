import { Zap, Youtube } from "lucide-react";
import type { ContentLength } from "@/lib/api/contentIdeas";

const LENGTHS: ContentLength[] = ["corto", "largo"];

const META: Record<
  ContentLength,
  { label: string; icon: typeof Zap; hint: string }
> = {
  corto: {
    label: "Corto",
    icon: Zap,
    hint: "Reels · Shorts · TikTok",
  },
  largo: {
    label: "Largo",
    icon: Youtube,
    hint: "YouTube long-form",
  },
};

/**
 * Primary content-length selector (corto vs largo). Deliberately large and
 * icon-led: it's the first decision on both the Ideas inbox and the Guiones
 * board — you pick the duration, then everything below it reacts.
 */
export default function LengthSwitch({
  value,
  onChange,
  counts,
  className = "",
}: {
  value: ContentLength;
  onChange: (v: ContentLength) => void;
  /** Optional pending/total badge per length. */
  counts?: Record<ContentLength, number>;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Duración del contenido"
      className={`inline-flex w-full max-w-md items-stretch gap-1.5 rounded-2xl border border-[var(--ll-border)] bg-[var(--ll-surface)] p-1.5 sm:w-auto ${className}`}
    >
      {LENGTHS.map((opt) => {
        const active = opt === value;
        const { label, icon: Icon, hint } = META[opt];
        const count = counts?.[opt] ?? 0;
        return (
          <button
            key={opt}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt)}
            className="group relative flex flex-1 items-center gap-3 rounded-xl px-5 py-3 text-left transition-all sm:flex-none"
            style={{
              background: active ? "var(--ll-accent)" : "transparent",
              color: active ? "#0a0a0a" : "var(--ll-text-dim)",
            }}
          >
            <Icon
              className="h-5 w-5 shrink-0"
              style={{ color: active ? "#0a0a0a" : "var(--ll-text-muted)" }}
            />
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span
                  className="text-base font-semibold leading-none"
                  style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "-0.01em" }}
                >
                  {label}
                </span>
                {count > 0 && (
                  <span
                    className="inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold"
                    style={{
                      background: active ? "#0a0a0a" : "var(--ll-accent)",
                      color: active ? "var(--ll-accent)" : "#0a0a0a",
                    }}
                  >
                    {count}
                  </span>
                )}
              </span>
              <span
                className="mt-0.5 block truncate text-[11px] leading-none"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: active ? "rgba(10,10,10,0.65)" : "var(--ll-text-dim)",
                }}
              >
                {hint}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
