import { useSession } from "@/hooks/useSession";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDashboard() {
  const { user } = useSession();
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div
          className="text-[10px] uppercase tracking-[0.25em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
        >
          Dashboard
        </div>
        <h1
          className="text-3xl md:text-4xl"
          style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
        >
          Hola, <em style={{ color: "var(--ll-accent)" }}>{user?.email?.split("@")[0]}</em>.
        </h1>
        <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
          Acá vas a ver tus métricas, asignaciones abiertas, ideas en draft y próximos posteos. Por ahora la app está en M1
          (auth + roles). Las features se prenden por hito.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Ideas en draft" value="—" hint="M2" />
        <KpiCard title="Asignaciones abiertas" value="—" hint="M6" />
        <KpiCard title="Pagos pendientes" value="—" hint="M6" />
        <KpiCard title="Videos del mes" value="—" hint="M4" />
      </section>

      <section className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-6">
        <div
          className="mb-2 text-[10px] uppercase tracking-[0.25em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-warm)" }}
        >
          Próximos hitos
        </div>
        <ol className="space-y-2 text-sm" style={{ color: "var(--ll-text-muted)" }}>
          <li>
            <span style={{ color: "var(--ll-text)" }}>M2 — Idea → Guion.</span> Subís audio o texto, te devuelve guion
            estructurado en tu estilo + B-rolls + lo agendás.
          </li>
          <li>
            <span style={{ color: "var(--ll-text)" }}>M3 — Catálogo de formatos.</span> CRUD con drag-drop.
          </li>
          <li>
            <span style={{ color: "var(--ll-text)" }}>M4 — Carga manual de videos posteados.</span> URL + métricas + guion
            + formato.
          </li>
          <li>
            <span style={{ color: "var(--ll-text)" }}>M5 — Calendario de contenido.</span>
          </li>
          <li>
            <span style={{ color: "var(--ll-text)" }}>M6 — Editor workflow.</span> Asignaciones, correcciones,
            aprobación, registro de pagos.
          </li>
          <li>
            <span style={{ color: "var(--ll-text)" }}>M7 — Asesor feedback.</span>
          </li>
        </ol>
      </section>
    </div>
  );
}

function KpiCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <Card className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
      <CardHeader className="pb-2">
        <CardTitle
          className="text-xs uppercase tracking-[0.15em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-muted)" }}
        >
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="text-3xl"
          style={{ fontFamily: "'Instrument Serif', serif", color: "var(--ll-accent)", lineHeight: 1 }}
        >
          {value}
        </div>
        {hint && (
          <div
            className="mt-2 text-[10px] uppercase tracking-[0.15em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
          >
            {hint}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
