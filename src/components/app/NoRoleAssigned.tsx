import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

export default function NoRoleAssigned() {
  const { user } = useSession();
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center"
      style={{ background: "var(--ll-bg)", color: "var(--ll-text)" }}
    >
      <div
        className="text-[10px] uppercase tracking-[0.25em]"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
      >
        Acceso restringido
      </div>
      <h1
        className="max-w-md text-3xl"
        style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
      >
        Tu cuenta no tiene un <em style={{ color: "var(--ll-warm)" }}>rol asignado.</em>
      </h1>
      <p className="max-w-md text-sm" style={{ color: "var(--ll-text-muted)" }}>
        Estás logueado como <strong style={{ color: "var(--ll-text)" }}>{user?.email}</strong>. Pedile al admin que te
        asigne un rol para entrar.
      </p>
      <Button variant="outline" size="sm" onClick={signOut} className="mt-2">
        Cerrar sesión
      </Button>
    </div>
  );
}
