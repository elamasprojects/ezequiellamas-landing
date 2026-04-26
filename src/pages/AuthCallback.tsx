import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        navigate("/auth/new-password", { replace: true });
      } else if (session) {
        navigate("/app", { replace: true });
      }
    });

    // Fallback: if no event fires in 5 s, go back to login
    const timer = setTimeout(() => navigate("/login", { replace: true }), 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
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
