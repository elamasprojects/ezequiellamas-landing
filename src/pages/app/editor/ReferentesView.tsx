import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useReferents } from "@/hooks/useReferents";
import { PlatformBadges } from "@/pages/app/admin/referentes/ReferentesList";

export default function ReferentesView() {
  const { data: referents, isLoading } = useReferents();

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div
          className="text-[10px] uppercase tracking-[0.25em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
        >
          Referentes
        </div>
        <h1
          className="text-2xl md:text-3xl"
          style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
        >
          Radar de <em style={{ color: "var(--ll-warm)" }}>inspiración</em>
        </h1>
        <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
          Creators que sigue el admin. Tocá uno para ver sus videos virales con guion y concepto extraído.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full bg-[var(--ll-surface)]" />
          <Skeleton className="h-16 w-full bg-[var(--ll-surface)]" />
        </div>
      ) : !referents || referents.length === 0 ? (
        <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-8 text-center">
          <Compass className="mx-auto h-6 w-6" style={{ color: "var(--ll-text-dim)" }} />
          <p className="mt-2 text-sm" style={{ color: "var(--ll-text-muted)" }}>
            El admin todavía no cargó referentes.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {referents.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4 transition-colors hover:border-[var(--ll-border-hover)]"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  to={`/app/editor/referentes/${r.id}`}
                  className="font-medium hover:underline"
                  style={{ color: "var(--ll-text)" }}
                >
                  {r.name}
                </Link>
                <PlatformBadges referent={r} />
              </div>
              {r.note && (
                <p className="mt-1 text-sm" style={{ color: "var(--ll-text-muted)" }}>
                  {r.note}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
