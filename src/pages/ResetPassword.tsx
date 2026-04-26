import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

type Status = "checking" | "ready" | "invalid";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Supabase JS client with detectSessionInUrl: true consumes the
      // recovery tokens from the URL hash and establishes a temporary
      // session. We poll briefly for it to land.
      for (let i = 0; i < 20; i++) {
        if (cancelled) return;
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setStatus("ready");
          return;
        }
        await new Promise((r) => setTimeout(r, 150));
      }
      if (!cancelled) setStatus("invalid");
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Contraseña actualizada.");
    navigate("/app", { replace: true });
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
          Nueva contraseña
        </div>
        <h1
          style={{
            fontFamily: "'Instrument Serif', serif",
            fontSize: "2rem",
            letterSpacing: "-0.02em",
            marginBottom: "1.5rem",
          }}
        >
          Definí tu contraseña
        </h1>

        {status === "checking" && (
          <p
            style={{
              color: "var(--ll-text-muted)",
              fontSize: "0.9rem",
              lineHeight: 1.6,
              fontFamily: "'JetBrains Mono', monospace",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
            }}
          >
            Verificando link...
          </p>
        )}

        {status === "invalid" && (
          <>
            <p
              style={{
                color: "var(--ll-text-muted)",
                fontSize: "0.9rem",
                lineHeight: 1.6,
                marginBottom: "1.5rem",
              }}
            >
              El link es inválido o expiró. Pedí uno nuevo desde el formulario de recuperación.
            </p>
            <Link
              to="/forgot-password"
              style={{
                color: "var(--ll-text-muted)",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.85rem",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
              }}
            >
              Pedir un link nuevo
            </Link>
          </>
        )}

        {status === "ready" && (
          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <input
              type="password"
              required
              placeholder="Nueva contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              style={inputStyle}
            />
            <input
              type="password"
              required
              placeholder="Repetí la contraseña"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={6}
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
              {submitting ? "Guardando..." : "Guardar contraseña"}
            </button>
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
