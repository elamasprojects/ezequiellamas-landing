export default function AdvisorDashboard() {
  return (
    <div className="space-y-6">
      <div
        className="text-[10px] uppercase tracking-[0.25em]"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
      >
        Asesor
      </div>
      <h1
        className="text-3xl"
        style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
      >
        Videos para <em style={{ color: "var(--ll-warm)" }}>revisar</em>
      </h1>
      <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-12 text-center">
        <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
          Todavía no hay videos cargados para que des feedback.
        </p>
        <p className="mt-2 text-xs" style={{ color: "var(--ll-text-dim)" }}>
          Cuando el admin sube un video, aparece acá para que comentes.
        </p>
      </div>
    </div>
  );
}
