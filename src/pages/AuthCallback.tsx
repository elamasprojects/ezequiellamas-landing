import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Supabase posts errors back as URL params (query or hash). Surface
      // them with a toast before redirecting back to /login.
      const hashParams = new URLSearchParams(
        window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash,
      );
      const queryParams = new URLSearchParams(window.location.search);
      const errorDescription =
        hashParams.get("error_description") ?? queryParams.get("error_description");
      const errorCode = hashParams.get("error") ?? queryParams.get("error");

      if (errorDescription || errorCode) {
        toast.error(errorDescription ?? errorCode ?? "No pudimos completar el acceso.");
        navigate("/login", { replace: true });
        return;
      }

      const flowType = hashParams.get("type") ?? queryParams.get("type");

      // Supabase JS client with detectSessionInUrl: true consumes the
      // OTP / OAuth params from the URL on import. We just wait until
      // a session shows up, then redirect.
      for (let i = 0; i < 20; i++) {
        if (cancelled) return;
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          if (flowType === "recovery") {
            navigate("/auth/reset-password", { replace: true });
          } else {
            navigate("/app", { replace: true });
          }
          return;
        }
        await new Promise((r) => setTimeout(r, 150));
      }
      if (!cancelled) {
        toast.error("El link expiró o ya fue usado. Pedí uno nuevo.");
        navigate("/login", { replace: true });
      }
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
