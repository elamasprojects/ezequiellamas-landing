export default function EditorDashboard() {
  return (
    <div className="space-y-6">
      <div
        className="text-[10px] uppercase tracking-[0.25em]"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
      >
        Editor
      </div>
      <h1
        className="text-3xl"
        style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
      >
        Tu <em style={{ color: "var(--ll-warm)" }}>cola</em> de trabajo
      </h1>
      <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-12 text-center">
        <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
          Todavía no tenés asignaciones.
        </p>
        <p className="mt-2 text-xs" style={{ color: "var(--ll-text-dim)" }}>
          El admin te avisa por mail cuando hay un video nuevo para editar.
        </p>
      </div>
    </div>
  );
}
