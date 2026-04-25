import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Block {
  label: string;
  hint: string;
  value: string | null | undefined;
  accentColor: string;
}

interface Props {
  hook?: string | null;
  development?: string | null;
  cta?: string | null;
  className?: string;
}

export default function ScriptStructure({ hook, development, cta, className }: Props) {
  const blocks: Block[] = [
    {
      label: "Hook",
      hint: "0–5s · ≤25 palabras",
      value: hook,
      accentColor: "var(--ll-accent)",
    },
    {
      label: "Development",
      hint: "60–120 palabras",
      value: development,
      accentColor: "var(--ll-warm)",
    },
    {
      label: "CTA",
      hint: "≤20 palabras",
      value: cta,
      accentColor: "var(--ll-blue)",
    },
  ];

  return (
    <div className={cn("space-y-3", className)}>
      {blocks.map((b) => (
        <Section key={b.label} label={b.label} hint={b.hint} accent={b.accentColor}>
          {b.value ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: "var(--ll-text)" }}>
              {b.value}
            </p>
          ) : (
            <p className="text-sm italic" style={{ color: "var(--ll-text-dim)" }}>
              (vacío)
            </p>
          )}
        </Section>
      ))}
    </div>
  );
}

function Section({
  label,
  hint,
  accent,
  children,
}: {
  label: string;
  hint: string;
  accent: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-5">
      <div className="mb-2 flex items-center justify-between">
        <span
          className="text-[10px] uppercase tracking-[0.2em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: accent }}
        >
          {label}
        </span>
        <span
          className="text-[10px] uppercase tracking-[0.15em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
        >
          {hint}
        </span>
      </div>
      {children}
    </div>
  );
}
