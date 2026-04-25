import { Link, useParams } from "react-router-dom";

export default function RecursoDetail() {
  const { slug } = useParams();

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
        Recurso · {slug}
      </div>
      <h1
        style={{
          fontFamily: "'Instrument Serif', serif",
          fontSize: "clamp(2rem, 4.5vw, 3.2rem)",
          letterSpacing: "-0.025em",
          marginBottom: "1rem",
          lineHeight: 1.1,
        }}
      >
        Detalle del <em style={{ color: "var(--ll-warm)", fontStyle: "italic" }}>recurso</em>
      </h1>
      <p style={{ color: "var(--ll-text-muted)", maxWidth: "640px", lineHeight: 1.7 }}>
        Placeholder. Cuando se conecte la base, este componente lee de Supabase
        (`recursos` table) por slug.
      </p>

      <Link
        to="/recursos"
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
        ← Volver a recursos
      </Link>
    </div>
  );
}
