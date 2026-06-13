import ContentCalendar from "@/components/app/ContentCalendar";

export default function CalendarPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div
          className="text-[10px] uppercase tracking-[0.25em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
        >
          Calendario
        </div>
        <h1
          className="text-2xl md:text-3xl"
          style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
        >
          Tus <em style={{ color: "var(--ll-warm)" }}>publicaciones</em> del mes
        </h1>
        <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
          Tocá un día para agendar uno de tus drafts (se programa a las 18:00 ART). Cambiá entre
          vista mensual y semanal.
        </p>
      </header>
      <ContentCalendar />
    </div>
  );
}
