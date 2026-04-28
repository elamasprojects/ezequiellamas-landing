import { Link } from "react-router-dom";
import { useSession } from "@/hooks/useSession";
import { useDashboardKpis } from "@/hooks/useDashboardKpis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDashboard() {
  const { user } = useSession();
  const { data: kpis, isLoading } = useDashboardKpis();

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
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Ideas en draft"
          value={fmt(kpis?.ideasDraft, isLoading)}
          to="/app/admin/ideas"
        />
        <KpiCard
          title="Asignaciones abiertas"
          value={fmt(kpis?.assignmentsOpen, isLoading)}
          to="/app/admin/assignments"
        />
        <KpiCard
          title="Pagos pendientes"
          value={fmt(kpis?.paymentsPending, isLoading)}
          to="/app/admin/assignments"
        />
        <KpiCard
          title="Videos del mes"
          value={fmt(kpis?.videosThisMonth, isLoading)}
          to="/app/admin/videos"
        />
      </section>
    </div>
  );
}

function fmt(value: number | undefined, loading: boolean): string {
  if (loading) return "…";
  if (value == null) return "—";
  return String(value);
}

function KpiCard({ title, value, to }: { title: string; value: string; to?: string }) {
  const card = (
    <Card className="h-full border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)] transition-colors hover:border-[var(--ll-border-strong)] hover:bg-[var(--ll-surface-2)]">
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
      </CardContent>
    </Card>
  );
  if (!to) return card;
  return (
    <Link to={to} className="block">
      {card}
    </Link>
  );
}
