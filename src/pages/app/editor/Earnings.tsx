import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAssignments } from "@/hooks/useAssignments";

export default function Earnings() {
  const { data: assignments, isLoading } = useAssignments();

  const approved = (assignments ?? []).filter((a) => a.status === "approved" && a.payment_amount);
  const pending = approved.filter((a) => a.payment_status === "pending");
  const paid = approved.filter((a) => a.payment_status === "paid");

  const sum = (arr: typeof approved) => arr.reduce((s, a) => s + (Number(a.payment_amount) || 0), 0);
  const pendingTotal = sum(pending);
  const paidTotal = sum(paid);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div
          className="text-[10px] uppercase tracking-[0.25em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
        >
          Ganancias
        </div>
        <h1
          className="text-2xl md:text-3xl"
          style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
        >
          Tus <em style={{ color: "var(--ll-warm)" }}>pagos</em>
        </h1>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryCard label="Pendiente de cobro" value={pendingTotal} accent="var(--ll-accent)" />
        <SummaryCard label="Cobrado total" value={paidTotal} accent="var(--ll-text-muted)" />
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full bg-[var(--ll-surface)]" />
      ) : (
        <>
          <Section title={`Pendientes (${pending.length})`}>
            {pending.length === 0 ? (
              <Empty text="No tenés pagos pendientes." />
            ) : (
              <RowList items={pending} />
            )}
          </Section>

          <Section title={`Cobrados (${paid.length})`}>
            {paid.length === 0 ? (
              <Empty text="Todavía no cobraste nada." />
            ) : (
              <RowList items={paid} showPaidAt />
            )}
          </Section>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-5">
      <div
        className="text-[10px] uppercase tracking-[0.15em]"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-muted)" }}
      >
        {label}
      </div>
      <div
        className="mt-2 text-3xl"
        style={{ fontFamily: "'Instrument Serif', serif", color: accent, lineHeight: 1 }}
      >
        USD {value.toFixed(2)}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2
        className="text-lg"
        style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-6 text-center text-sm"
       style={{ color: "var(--ll-text-muted)" }}>
      {text}
    </p>
  );
}

function RowList({
  items,
  showPaidAt,
}: {
  items: Array<{
    id: string;
    title: string;
    payment_amount: number | null;
    payment_currency: string;
    paid_at: string | null;
    created_at: string;
  }>;
  showPaidAt?: boolean;
}) {
  return (
    <ul className="space-y-2">
      {items.map((a) => (
        <li key={a.id}>
          <Link
            to={`/app/editor/${a.id}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4 transition-colors hover:border-[var(--ll-border-hover)]"
          >
            <div className="min-w-0">
              <h3 className="truncate font-medium" style={{ color: "var(--ll-text)" }}>
                {a.title}
              </h3>
              <p
                className="mt-1 text-xs"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
              >
                {showPaidAt && a.paid_at
                  ? `Cobrado ${new Date(a.paid_at).toLocaleDateString("es-AR")}`
                  : `Aprobado ${new Date(a.created_at).toLocaleDateString("es-AR")}`}
              </p>
            </div>
            <Badge
              variant="outline"
              className={
                showPaidAt
                  ? "border-[var(--ll-border)] text-[var(--ll-text-muted)]"
                  : "border-[var(--ll-accent)]/40 bg-[var(--ll-accent)]/15 text-[var(--ll-accent)]"
              }
            >
              {a.payment_currency} {a.payment_amount}
            </Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}
