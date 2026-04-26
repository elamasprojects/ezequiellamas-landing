import { Link } from "react-router-dom";
import { useResources } from "@/hooks/useResources";
import type { Resource } from "@/lib/api/resources";

export default function RecursosList() {
  const { data: resources, isLoading } = useResources({ publishedOnly: true });

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
      <header style={{ maxWidth: "960px", marginBottom: "3rem" }}>
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
          <em style={{ color: "var(--ll-warm)", fontStyle: "italic" }}>Biblioteca</em> pública.
        </h1>
        <p
          style={{
            color: "var(--ll-text-muted)",
            fontSize: "1.05rem",
            maxWidth: "640px",
            lineHeight: 1.7,
          }}
        >
          Guías, frameworks y plantillas que uso para construir negocios con IA.
          Gratis. Para leer en el browser o bajar en PDF.
        </p>
      </header>

      {isLoading ? (
        <div
          style={{
            color: "var(--ll-text-dim)",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.78rem",
          }}
        >
          Cargando...
        </div>
      ) : !resources || resources.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1.5rem",
            maxWidth: "1200px",
          }}
        >
          {resources.map((r) => (
            <ResourceCard key={r.id} resource={r} />
          ))}
        </div>
      )}

      <Link
        to="/"
        style={{
          display: "inline-block",
          marginTop: "3rem",
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

function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <Link
      to={`/recursos/${resource.slug}`}
      style={{
        display: "flex",
        flexDirection: "column",
        background: "var(--ll-surface)",
        border: "1px solid var(--ll-border)",
        borderRadius: "12px",
        overflow: "hidden",
        textDecoration: "none",
        color: "inherit",
        transition: "border-color 0.2s, transform 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--ll-accent)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--ll-border)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {resource.cover_image_url ? (
        <div
          style={{
            aspectRatio: "16 / 9",
            overflow: "hidden",
            background: "var(--ll-surface-2)",
          }}
        >
          <img
            src={resource.cover_image_url}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      ) : (
        <div
          style={{
            aspectRatio: "16 / 9",
            background:
              "linear-gradient(135deg, var(--ll-surface-2), var(--ll-surface))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ll-accent)",
            fontFamily: "'Instrument Serif', serif",
            fontSize: "2.5rem",
            fontStyle: "italic",
            opacity: 0.4,
          }}
        >
          E·L
        </div>
      )}

      <div style={{ padding: "1.25rem 1.25rem 1.5rem", flex: 1, display: "flex", flexDirection: "column" }}>
        {resource.published_at && (
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.62rem",
              color: "var(--ll-text-dim)",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              marginBottom: "0.6rem",
            }}
          >
            {new Date(resource.published_at).toLocaleDateString("es-AR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </div>
        )}
        <h3
          style={{
            fontFamily: "'Instrument Serif', serif",
            fontSize: "1.4rem",
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
            marginBottom: "0.75rem",
          }}
        >
          {resource.title}
        </h3>
        {resource.summary && (
          <p
            style={{
              color: "var(--ll-text-muted)",
              fontSize: "0.9rem",
              lineHeight: 1.5,
              marginBottom: "1rem",
              flex: 1,
            }}
          >
            {resource.summary}
          </p>
        )}
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.7rem",
            color: "var(--ll-accent)",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            marginTop: "auto",
          }}
        >
          Leer →
        </span>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        padding: "3rem 2rem",
        textAlign: "center",
        background: "var(--ll-surface)",
        border: "1px solid var(--ll-border)",
        borderRadius: "12px",
        maxWidth: "560px",
      }}
    >
      <p
        style={{
          fontFamily: "'Instrument Serif', serif",
          fontSize: "1.4rem",
          fontStyle: "italic",
          color: "var(--ll-text-muted)",
          marginBottom: "0.5rem",
        }}
      >
        Próximamente.
      </p>
      <p style={{ color: "var(--ll-text-dim)", fontSize: "0.9rem" }}>
        Estoy armando los primeros recursos. Volvé pronto.
      </p>
    </div>
  );
}
