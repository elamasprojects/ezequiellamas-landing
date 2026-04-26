import { useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { Download } from "lucide-react";
import { useResourceBySlug } from "@/hooks/useResourceBySlug";
import ResourceFrame, { type ResourceFrameHandle } from "@/components/app/ResourceFrame";

function setMeta(name: string, content: string) {
  if (!content) return;
  const isOg = name.startsWith("og:");
  const attr = isOg ? "property" : "name";
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export default function RecursoDetail() {
  const { slug } = useParams();
  const { data: resource, isLoading, error } = useResourceBySlug(slug);
  const frameRef = useRef<ResourceFrameHandle>(null);

  useEffect(() => {
    if (!resource) return;
    const prevTitle = document.title;
    document.title = `${resource.title} — Ezequiel Lamas`;
    if (resource.summary) setMeta("description", resource.summary);
    setMeta("og:title", resource.title);
    if (resource.summary) setMeta("og:description", resource.summary);
    if (resource.cover_image_url) setMeta("og:image", resource.cover_image_url);
    setMeta("og:url", `https://ezequiellamas.com/recursos/${resource.slug}`);
    setMeta("og:type", "article");
    return () => {
      document.title = prevTitle;
    };
  }, [resource]);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--ll-bg)",
          color: "var(--ll-text-muted)",
          padding: "6rem 6vw",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.78rem",
        }}
      >
        Cargando...
      </div>
    );
  }

  if (error || !resource) {
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
        <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "2rem", marginBottom: "1rem" }}>
          Recurso no encontrado
        </h1>
        <p style={{ color: "var(--ll-text-muted)" }}>
          El link que seguiste no existe o el recurso fue despublicado.
        </p>
        <Link
          to="/recursos"
          style={{
            display: "inline-block",
            marginTop: "1.5rem",
            color: "var(--ll-accent)",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            textDecoration: "none",
          }}
        >
          ← Volver a recursos
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--ll-bg)",
        color: "var(--ll-text)",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div style={{ padding: "5rem 6vw 1.5rem" }}>
        <Link
          to="/recursos"
          style={{
            display: "inline-block",
            marginBottom: "1.5rem",
            color: "var(--ll-text-muted)",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.7rem",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            textDecoration: "none",
          }}
        >
          ← Volver a recursos
        </Link>

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "1.5rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ maxWidth: "640px" }}>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.65rem",
                color: "var(--ll-accent)",
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                marginBottom: "0.8rem",
              }}
            >
              Recurso
              {resource.published_at && (
                <span style={{ color: "var(--ll-text-dim)" }}>
                  {" · "}
                  {new Date(resource.published_at).toLocaleDateString("es-AR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
            <h1
              style={{
                fontFamily: "'Instrument Serif', serif",
                fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
                lineHeight: 1.15,
                letterSpacing: "-0.025em",
                marginBottom: "1rem",
              }}
            >
              {resource.title}
            </h1>
            {resource.summary && (
              <p
                style={{
                  color: "var(--ll-text-muted)",
                  fontSize: "1rem",
                  lineHeight: 1.6,
                }}
              >
                {resource.summary}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => frameRef.current?.print()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "var(--ll-accent)",
              color: "#0a0a0a",
              border: "none",
              borderRadius: "100px",
              padding: "0.75rem 1.25rem",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontWeight: 600,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <Download style={{ width: 14, height: 14 }} />
            Descargar PDF
          </button>
        </div>
      </div>

      <div style={{ padding: "0 4vw 3rem" }}>
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
            maxWidth: "1100px",
            margin: "0 auto",
          }}
        >
          <ResourceFrame ref={frameRef} html={resource.html_body} title={resource.title} />
        </div>
      </div>

      <footer
        style={{
          padding: "2rem 6vw 4rem",
          borderTop: "1px solid var(--ll-border)",
        }}
      >
        <div
          style={{
            maxWidth: "640px",
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: "'Instrument Serif', serif",
              fontSize: "1.4rem",
              fontStyle: "italic",
              lineHeight: 1.4,
              marginBottom: "1.5rem",
            }}
          >
            ¿Te sirvió? Seguime para más cosas como esta.
          </p>
          <div
            style={{
              display: "flex",
              gap: "1.5rem",
              justifyContent: "center",
              flexWrap: "wrap",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            <a
              href="https://instagram.com/ezequiellamass"
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--ll-accent)", textDecoration: "none" }}
            >
              Instagram
            </a>
            <a
              href="https://youtube.com/@ezequiellamass"
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--ll-accent)", textDecoration: "none" }}
            >
              YouTube
            </a>
            <Link to="/" style={{ color: "var(--ll-text-muted)", textDecoration: "none" }}>
              Sobre Ezequiel
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
