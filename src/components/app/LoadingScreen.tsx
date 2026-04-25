export default function LoadingScreen({ label = "Cargando..." }: { label?: string }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: "var(--ll-bg)", color: "var(--ll-text-muted)" }}
    >
      <span
        className="text-xs uppercase tracking-[0.15em]"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {label}
      </span>
    </div>
  );
}
