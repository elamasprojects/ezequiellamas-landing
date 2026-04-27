import { useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectionCard } from "@/components/publishing/ConnectionCard";
import { useSocialAccounts } from "@/hooks/useSocialAccounts";
import { usePushPermission } from "@/hooks/usePushPermission";
import { completeOAuth } from "@/lib/api/publishing";
import { PUBLISH_PLATFORMS, type PublishPlatform } from "@/lib/publishing/platformLimits";

export default function Connections() {
  const { data: accounts = [], isLoading } = useSocialAccounts();
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const { status: pushStatus, subscribed, busy: pushBusy, subscribe, unsubscribe } = usePushPermission();

  const callbackMutation = useMutation({
    mutationFn: (input: { platform: PublishPlatform; code: string; state: string }) =>
      completeOAuth(input),
    onSuccess: (res) => {
      toast.success(`Conectado: ${res.display_name ?? "OK"}`);
      qc.invalidateQueries({ queryKey: ["social-accounts"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Handle OAuth callback redirect
  useEffect(() => {
    const platform = params.get("platform");
    const code = params.get("code");
    const state = params.get("state");
    if (platform && code && state && PUBLISH_PLATFORMS.includes(platform as PublishPlatform)) {
      callbackMutation.mutate({ platform: platform as PublishPlatform, code, state });
      // Clean URL
      const next = new URLSearchParams(params);
      next.delete("code");
      next.delete("state");
      next.delete("platform");
      setParams(next, { replace: true });
    }
  }, [params, setParams, callbackMutation]);

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-[var(--ll-text-muted)]">
          <Link to="/app/admin/publishing">
            <ArrowLeft className="h-4 w-4" /> Volver a Publicaciones
          </Link>
        </Button>
        <div className="space-y-2">
          <div
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
          >
            Conexiones
          </div>
          <h1
            className="text-2xl md:text-3xl"
            style={{
              fontFamily: "'Instrument Serif', serif",
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
            }}
          >
            Plataformas <em style={{ color: "var(--ll-warm)" }}>conectadas</em>
          </h1>
          <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
            Conectá tus cuentas de Instagram, YouTube y TikTok para publicar desde acá. Si no
            tenés una conectada, los posts a esa plataforma quedan en modo manual.
          </p>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--ll-text-muted)" }}>
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando conexiones…
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {PUBLISH_PLATFORMS.map((p) => (
            <ConnectionCard key={p} platform={p} account={accounts.find((a) => a.platform === p)} />
          ))}
        </div>
      )}

      <section className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-5 space-y-3">
        <div className="flex items-center gap-2">
          {subscribed ? (
            <Bell className="h-4 w-4 text-[var(--ll-accent)]" />
          ) : (
            <BellOff className="h-4 w-4" style={{ color: "var(--ll-text-dim)" }} />
          )}
          <h2 className="text-base font-medium" style={{ color: "var(--ll-text)" }}>
            Notificaciones push
          </h2>
        </div>
        <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
          Recibí en este navegador alertas de "tu post está por salir", "publicado OK", "error" o
          "tap final pendiente en TikTok". Sin esto vas a depender solo del email.
        </p>

        {pushStatus === "unsupported" ? (
          <p className="text-sm" style={{ color: "var(--ll-warm)" }}>
            Este navegador no soporta web push.
          </p>
        ) : pushStatus === "denied" ? (
          <p className="text-sm" style={{ color: "var(--ll-warm)" }}>
            Bloqueaste las notificaciones desde el browser. Podés reactivarlas desde la configuración
            del sitio.
          </p>
        ) : subscribed ? (
          <Button variant="outline" size="sm" disabled={pushBusy} onClick={() => void unsubscribe()}>
            {pushBusy && <Loader2 className="h-4 w-4 animate-spin" />}
            Desactivar push
          </Button>
        ) : (
          <Button variant="brand" size="sm" disabled={pushBusy} onClick={() => void subscribe()}>
            {pushBusy && <Loader2 className="h-4 w-4 animate-spin" />}
            Activar push
          </Button>
        )}
      </section>
    </div>
  );
}
