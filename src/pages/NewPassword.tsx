import { useState, type FormEvent, type CSSProperties } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

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

export default function NewPassword() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && !session) return <Navigate to="/login" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Contraseña guardada. Ingresando...");
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
          Acceso
        </div>
        <h1
          style={{
            fontFamily: "'Instrument Serif', serif",
            fontSize: "2rem",
            letterSpacing: "-0.02em",
            marginBottom: "0.5rem",
          }}
        >
          Nueva contraseña
        </h1>
        <p style={{ color: "var(--ll-text-muted)", fontSize: "0.85rem", lineHeight: 1.5, marginBottom: "1.5rem" }}>
          Elegí una contraseña de al menos 8 caracteres.
        </p>

        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <input
            type="password"
            required
            placeholder="Nueva contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
          <input
            type="password"
            required
            placeholder="Confirmá la contraseña"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
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
      </div>
    </div>
  );
}
