import { useState, type FormEvent, type CSSProperties } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

type Mode = "magic" | "password" | "reset";

const inputStyle: CSSProperties = {
  width: "100%",
  background: "var(--ll-surface-2)",
  border: "1px solid var(--ll-border)",
  borderRadius: "10px",
  padding: "0.9rem 1rem",
  color: "var(--ll-text)",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: "0.92rem",
  outline: "none",
  boxSizing: "border-box",
};

export default function Login() {
  const { session, loading } = useSession();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  if (!loading && session) return <Navigate to="/app" replace />;

  function switchMode(next: Mode) {
    setMode(next);
    setSent(false);
    setPassword("");
  }

  async function handleMagicLink(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
    toast.success("Magic link enviado. Revisá tu mail.");
  }

  async function handlePassword(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) { toast.error(error.message); }
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
    toast.success("Link enviado. Revisá tu mail.");
  }

  const title =
    mode === "magic" ? "Iniciá sesión" :
    mode === "password" ? "Iniciá sesión" :
    "Restablecer contraseña";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        background: "var(--ll-bg)",
        color: "var(--ll-text)",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "var(--ll-surface)",
          border: "1px solid var(--ll-border)",
          borderRadius: "14px",
          padding: "2.5rem",
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
          Acceso
        </div>
        <h1
          style={{
            fontFamily: "'Instrument Serif', serif",
            fontSize: "2rem",
            letterSpacing: "-0.02em",
            marginBottom: "1.5rem",
          }}
        >
          {title}
        </h1>

        {/* Tabs magic / password — only shown outside reset mode */}
        {mode !== "reset" && (
          <div
            style={{
              display: "flex",
              gap: "0.25rem",
              marginBottom: "1.5rem",
              background: "var(--ll-surface-2)",
              borderRadius: "10px",
              padding: "0.25rem",
            }}
          >
            {(["password", "magic"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                style={{
                  flex: 1,
                  padding: "0.55rem 0.75rem",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.7rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontWeight: 600,
                  background: mode === m ? "var(--ll-accent)" : "transparent",
                  color: mode === m ? "#0a0a0a" : "var(--ll-text-muted)",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {m === "password" ? "Contraseña" : "Magic link"}
              </button>
            ))}
          </div>
        )}

        {/* Magic link */}
        {mode === "magic" && (
          sent ? (
            <p style={{ color: "var(--ll-text-muted)", fontSize: "0.9rem", lineHeight: 1.6 }}>
              Te mandamos un magic link a{" "}
              <strong style={{ color: "var(--ll-text)" }}>{email}</strong>.
              Hacé clic ahí y volvé a esta página.
            </p>
          ) : (
            <form onSubmit={handleMagicLink} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <input
                type="email"
                required
                placeholder="vos@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: "100%",
                  background: "var(--ll-accent)",
                  color: "#0a0a0a",
                  border: "none",
                  borderRadius: "10px",
                  padding: "0.9rem 1rem",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.78rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  cursor: submitting ? "wait" : "pointer",
                  opacity: submitting ? 0.6 : 1,
                  fontWeight: 600,
                }}
              >
                {submitting ? "Enviando..." : "Mandame el magic link"}
              </button>
            </form>
          )
        )}

        {/* Email + contraseña */}
        {mode === "password" && (
          <form onSubmit={handlePassword} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <input
              type="email"
              required
              placeholder="vos@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
            <input
              type="password"
              required
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: "100%",
                background: "var(--ll-accent)",
                color: "#0a0a0a",
                border: "none",
                borderRadius: "10px",
                padding: "0.9rem 1rem",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.78rem",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                cursor: submitting ? "wait" : "pointer",
                opacity: submitting ? 0.6 : 1,
                fontWeight: 600,
              }}
            >
              {submitting ? "Ingresando..." : "Ingresar"}
            </button>
            <button
              type="button"
              onClick={() => switchMode("reset")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--ll-text-muted)",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.82rem",
                textAlign: "center",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
                padding: 0,
              }}
            >
              Olvidé mi contraseña
            </button>
          </form>
        )}

        {/* Reset de contraseña */}
        {mode === "reset" && (
          sent ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <p style={{ color: "var(--ll-text-muted)", fontSize: "0.9rem", lineHeight: 1.6 }}>
                Te mandamos un link a{" "}
                <strong style={{ color: "var(--ll-text)" }}>{email}</strong>{" "}
                para restablecer tu contraseña.
              </p>
              <button
                type="button"
                onClick={() => switchMode("password")}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--ll-text-muted)",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.82rem",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                  padding: 0,
                }}
              >
                ← Volver al login
              </button>
            </div>
          ) : (
            <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <p style={{ color: "var(--ll-text-muted)", fontSize: "0.85rem", lineHeight: 1.5, margin: 0 }}>
                Ingresá tu email y te mandamos un link para crear o cambiar tu contraseña.
              </p>
              <input
                type="email"
                required
                placeholder="vos@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: "100%",
                  background: "var(--ll-accent)",
                  color: "#0a0a0a",
                  border: "none",
                  borderRadius: "10px",
                  padding: "0.9rem 1rem",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.78rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  cursor: submitting ? "wait" : "pointer",
                  opacity: submitting ? 0.6 : 1,
                  fontWeight: 600,
                }}
              >
                {submitting ? "Enviando..." : "Mandar link"}
              </button>
              <button
                type="button"
                onClick={() => switchMode("password")}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--ll-text-muted)",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.82rem",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                  padding: 0,
                }}
              >
                ← Volver al login
              </button>
            </form>
          )
        )}
      </div>
    </div>
  );
}
