import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

export default function Login() {
  const { session, loading } = useSession();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  if (!loading && session) return <Navigate to="/app" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success("Magic link enviado. Revisá tu mail.");
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

        {sent ? (
          <p style={{ color: "var(--ll-text-muted)", fontSize: "0.9rem", lineHeight: 1.6 }}>
            Te mandamos un magic link a <strong style={{ color: "var(--ll-text)" }}>{email}</strong>.
            Hacé clic ahí y vuelve a esta página.
          </p>
        ) : (
          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <input
              type="email"
              required
              placeholder="vos@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                background: "var(--ll-surface-2)",
                border: "1px solid var(--ll-border)",
                borderRadius: "10px",
                padding: "0.9rem 1rem",
                color: "var(--ll-text)",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.92rem",
                outline: "none",
              }}
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
        )}
      </div>
    </div>
  );
}
