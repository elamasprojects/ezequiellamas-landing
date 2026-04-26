import { Library } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormats } from "@/hooks/useFormats";

export default function FormatsView() {
  const { data: formats, isLoading } = useFormats();

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div
          className="text-[10px] uppercase tracking-[0.25em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
        >
          Formatos
        </div>
        <h1
          className="text-2xl md:text-3xl"
          style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
        >
          Cómo <em style={{ color: "var(--ll-warm)" }}>graba</em>
        </h1>
        <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
          El catálogo de formatos del admin (read-only). Te sirve de contexto cuando das feedback.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full bg-[var(--ll-surface)]" />
          <Skeleton className="h-20 w-full bg-[var(--ll-surface)]" />
        </div>
      ) : !formats || formats.length === 0 ? (
        <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-8 text-center">
          <Library className="mx-auto h-6 w-6" style={{ color: "var(--ll-text-dim)" }} />
          <p className="mt-2 text-sm" style={{ color: "var(--ll-text-muted)" }}>
            El admin todavía no cargó formatos.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {formats.map((f) => (
            <li
              key={f.id}
              className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4"
            >
              <h3 className="font-medium" style={{ color: "var(--ll-text)" }}>
                {f.name}
              </h3>
              {f.description && (
                <p className="mt-1 text-sm" style={{ color: "var(--ll-text-muted)" }}>
                  {f.description}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
