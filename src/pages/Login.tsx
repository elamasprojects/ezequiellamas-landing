import { useState, type FormEvent } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

type Tab = "magic-link" | "password";

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
  boxSizing: "border-box",
};

const primaryBtn: React.CSSProperties = {
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
  cursor: "pointer",
};

const linkBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--ll-text-muted)",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: "0.82rem",
  cursor: "pointer",
  textAlign: "center",
  textDecoration: "underline",
  padding: 0,
};

export default function Login() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isSetPassword = searchParams.get("mode") === "set-password";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [tab, setTab] = useState<Tab>("magic-link");
  const [magicSent, setMagicSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && session && !isSetPassword) return <Navigate to="/app" replace />;

  async function onMagicLink(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    setMagicSent(true);
  }

  async function onPasswordLogin(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    // useSession will detect the new session and redirect via the Navigate above
  }

  async function onSendReset(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    setResetSent(true);
  }

  async function onSetPassword(e: FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Contraseña guardada. Bienvenido.");
    navigate("/app", { replace: true });
  }

  function switchTab(t: Tab) {
    setTab(t);
    setMagicSent(false);
    setResetSent(false);
    setShowForgot(false);
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
          {isSetPassword ? "Crear contraseña" : "Iniciá sesión"}
        </h1>

        {isSetPassword ? (
          <form onSubmit={onSetPassword} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <p style={{ color: "var(--ll-text-muted)", fontSize: "0.85rem", margin: 0 }}>
              Elegí una contraseña para tu cuenta.
            </p>
            <input
              type="password"
              required
              placeholder="Nueva contraseña (mín. 6 caracteres)"
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={inputStyle}
            />
            <button
              type="submit"
              disabled={submitting}
              style={{ ...primaryBtn, cursor: submitting ? "wait" : "pointer", opacity: submitting ? 0.6 : 1 }}
            >
              {submitting ? "Guardando..." : "Guardar contraseña"}
            </button>
          </form>
        ) : (
          <>
            {/* Tab toggle */}
            <div
              style={{
                display: "flex",
                gap: "1.5rem",
                marginBottom: "1.5rem",
                borderBottom: "1px solid var(--ll-border)",
              }}
            >
              {(["magic-link", "password"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => switchTab(t)}
                  style={{
                    background: "transparent",
                    border: "none",
                    borderBottom: tab === t ? "2px solid var(--ll-accent)" : "2px solid transparent",
                    padding: "0 0 0.6rem",
                    marginBottom: "-1px",
                    color: tab === t ? "var(--ll-text)" : "var(--ll-text-muted)",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.88rem",
                    fontWeight: tab === t ? 600 : 400,
                    cursor: "pointer",
                  }}
                >
                  {t === "magic-link" ? "Magic link" : "Contraseña"}
                </button>
              ))}
            </div>

            {/* Magic link tab */}
            {tab === "magic-link" && (
              magicSent ? (
                <p style={{ color: "var(--ll-text-muted)", fontSize: "0.9rem", lineHeight: 1.6, margin: 0 }}>
                  Te mandamos un magic link a{" "}
                  <strong style={{ color: "var(--ll-text)" }}>{email}</strong>.
                  Hacé clic ahí y volvé a esta página.
                </p>
              ) : (
                <form onSubmit={onMagicLink} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
                    style={{ ...primaryBtn, cursor: submitting ? "wait" : "pointer", opacity: submitting ? 0.6 : 1 }}
                  >
                    {submitting ? "Enviando..." : "Mandame el magic link"}
                  </button>
                </form>
              )
            )}

            {/* Password tab */}
            {tab === "password" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {!showForgot ? (
                  <form onSubmit={onPasswordLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
                      style={{ ...primaryBtn, cursor: submitting ? "wait" : "pointer", opacity: submitting ? 0.6 : 1 }}
                    >
                      {submitting ? "Ingresando..." : "Ingresar"}
                    </button>
                    <button type="button" onClick={() => setShowForgot(true)} style={linkBtn}>
                      ¿Olvidaste o no tenés contraseña?
                    </button>
                  </form>
                ) : resetSent ? (
                  <p style={{ color: "var(--ll-text-muted)", fontSize: "0.9rem", lineHeight: 1.6, margin: 0 }}>
                    Te mandamos un link a{" "}
                    <strong style={{ color: "var(--ll-text)" }}>{email}</strong>{" "}
                    para crear o resetear tu contraseña.
                  </p>
                ) : (
                  <form onSubmit={onSendReset} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <p style={{ color: "var(--ll-text-muted)", fontSize: "0.85rem", margin: 0 }}>
                      Ingresá tu mail y te mandamos un link para crear o resetear tu contraseña.
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
                      style={{ ...primaryBtn, cursor: submitting ? "wait" : "pointer", opacity: submitting ? 0.6 : 1 }}
                    >
                      {submitting ? "Enviando..." : "Mandar link de contraseña"}
                    </button>
                    <button type="button" onClick={() => setShowForgot(false)} style={linkBtn}>
                      ← Volver
                    </button>
                  </form>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
