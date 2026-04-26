import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

type Mode = "password" | "magic";

export default function Login() {
  const { session, loading } = useSession();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  if (!loading && session) return <Navigate to="/app" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);

    if (mode === "password") {
      if (!password) {
        setSubmitting(false);
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setSubmitting(false);
      if (error) {
        const msg =
          error.message === "Invalid login credentials"
            ? "Email o contraseña incorrectos."
            : error.message;
        toast.error(msg);
        return;
      }
      toast.success("Bienvenido.");
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setMagicSent(true);
    toast.success("Magic link enviado. Revisá tu mail.");
  }

  function switchMode(next: Mode) {
    setMode(next);
    setMagicSent(false);
  }

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
          Iniciá sesión
        </h1>

        {mode === "magic" && magicSent ? (
          <>
            <p style={{ color: "var(--ll-text-muted)", fontSize: "0.9rem", lineHeight: 1.6 }}>
              Te mandamos un magic link a <strong style={{ color: "var(--ll-text)" }}>{email}</strong>.
              Hacé clic ahí y vuelve a esta página.
            </p>
            <button
              type="button"
              onClick={() => switchMode("password")}
              style={linkButtonStyle}
            >
              Volver a iniciar sesión con contraseña
            </button>
          </>
        ) : (
          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <input
              type="email"
              required
              placeholder="vos@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              style={inputStyle}
            />

            {mode === "password" && (
              <input
                type="password"
                required
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                style={inputStyle}
              />
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                ...primaryButtonStyle,
                cursor: submitting ? "wait" : "pointer",
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting
                ? mode === "password"
                  ? "Ingresando..."
                  : "Enviando..."
                : mode === "password"
                  ? "Iniciar sesión"
                  : "Mandame el magic link"}
            </button>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                marginTop: "0.5rem",
                alignItems: "center",
              }}
            >
              {mode === "password" ? (
                <>
                  <button type="button" onClick={() => switchMode("magic")} style={linkButtonStyle}>
                    Mandame un magic link en su lugar
                  </button>
                  <Link to="/forgot-password" style={linkAnchorStyle}>
                    ¿Olvidaste tu contraseña?
                  </Link>
                </>
              ) : (
                <button type="button" onClick={() => switchMode("password")} style={linkButtonStyle}>
                  Iniciar sesión con contraseña
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--ll-surface-2)",
  border: "1px solid var(--ll-border)",
  borderRadius: "10px",
  padding: "0.9rem 1rem",
  color: "var(--ll-text)",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: "0.92rem",
  outline: "none",
};

const primaryButtonStyle: React.CSSProperties = {
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
  fontWeight: 600,
};

const linkButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  padding: 0,
  margin: 0,
  color: "var(--ll-text-muted)",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: "0.85rem",
  cursor: "pointer",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
};

const linkAnchorStyle: React.CSSProperties = {
  color: "var(--ll-text-muted)",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: "0.85rem",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
};
