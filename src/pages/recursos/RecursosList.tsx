import { Link } from "react-router-dom";

export default function RecursosList() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--ll-bg)",
        color: "var(--ll-text)",
        fontFamily: "'DM Sans', sans-serif",
        padding: "6rem 6vw 4rem",
      }}
    >
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.68rem",
          color: "var(--ll-accent)",
          textTransform: "uppercase",
          letterSpacing: "0.25em",
          marginBottom: "0.8rem",
        }}
      >
        Recursos
      </div>
      <h1
        style={{
          fontFamily: "'Instrument Serif', serif",
          fontSize: "clamp(2.2rem, 4.5vw, 3.8rem)",
          letterSpacing: "-0.025em",
          marginBottom: "1rem",
          lineHeight: 1.1,
        }}
      >
        Próximamente — <em style={{ color: "var(--ll-warm)", fontStyle: "italic" }}>recursos</em> para emprendedores.
      </h1>
      <p
        style={{
          color: "var(--ll-text-muted)",
          fontSize: "1.05rem",
          maxWidth: "640px",
          lineHeight: 1.7,
        }}
      >
        Una biblioteca de plantillas, frameworks, lecturas y herramientas para construir
        negocios mejores. La estoy armando.
      </p>

      <Link
        to="/"
        style={{
          display: "inline-block",
          marginTop: "2rem",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.7rem",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "var(--ll-text-dim)",
          textDecoration: "none",
        }}
      >
        ← Volver al inicio
      </Link>
    </div>
  );
}
