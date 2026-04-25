import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.5rem",
        background: "var(--ll-bg)",
        color: "var(--ll-text)",
        fontFamily: "'DM Sans', sans-serif",
        padding: "2rem",
      }}
    >
      <div
        style={{
          fontFamily: "'Instrument Serif', serif",
          fontSize: "clamp(3rem, 8vw, 6rem)",
          color: "var(--ll-accent)",
          lineHeight: 1,
        }}
      >
        404
      </div>
      <p style={{ color: "var(--ll-text-muted)", fontSize: "0.95rem" }}>
        Esta página no existe.
      </p>
      <Link
        to="/"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.72rem",
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          color: "var(--ll-accent)",
          textDecoration: "none",
          border: "1px solid var(--ll-border)",
          padding: "0.7rem 1.4rem",
          borderRadius: "100px",
        }}
      >
        Volver al inicio
      </Link>
    </div>
  );
}
