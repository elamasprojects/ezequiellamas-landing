import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Supabase JS client with detectSessionInUrl: true consumes the
      // OTP / OAuth params from the URL on import. We just wait until
      // a session shows up, then redirect.
      for (let i = 0; i < 20; i++) {
        if (cancelled) return;
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          navigate("/app", { replace: true });
          return;
        }
        await new Promise((r) => setTimeout(r, 150));
      }
      navigate("/login", { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--ll-bg)",
        color: "var(--ll-text-muted)",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "0.78rem",
        textTransform: "uppercase",
        letterSpacing: "0.15em",
      }}
    >
      Verificando sesión...
    </div>
  );
}
