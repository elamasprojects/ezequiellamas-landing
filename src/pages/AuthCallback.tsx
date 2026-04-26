import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const navigate = useNavigate();

  // Capture URL type before Supabase strips the hash/params during token exchange
  const urlType = (() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const search = new URLSearchParams(window.location.search);
    return hash.get("type") || search.get("type");
  })();

  useEffect(() => {
    let done = false;

    const go = (path: string) => {
      if (done) return;
      done = true;
      navigate(path, { replace: true });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        go("/login?mode=set-password");
      } else if (event === "SIGNED_IN" && session) {
        go("/app");
      } else if (event === "INITIAL_SESSION" && session) {
        // Session was already established before subscription — use URL type to route
        go(urlType === "recovery" ? "/login?mode=set-password" : "/app");
      }
    });

    // Fallback: if nothing fires in 5s, send back to login
    const timeout = setTimeout(() => go("/login"), 5000);

    return () => {
      done = true;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate, urlType]);

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
