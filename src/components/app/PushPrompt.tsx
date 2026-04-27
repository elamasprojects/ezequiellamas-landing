import { useEffect, useState } from "react";
import { Bell, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushPermission } from "@/hooks/usePushPermission";

const DISMISS_KEY = "ll.push_prompt_dismissed";

export default function PushPrompt() {
  const { status, subscribed, busy, subscribe } = usePushPermission();
  const [dismissed, setDismissed] = useState<boolean>(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (subscribed || dismissed || status === "denied" || status === "unsupported") return null;
  if (status !== "default") return null;

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div
      className="mb-4 flex items-start gap-3 rounded-lg border border-[var(--ll-accent)]/30 bg-[var(--ll-accent)]/10 p-3"
      role="alert"
    >
      <Bell className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--ll-accent)" }} />
      <div className="flex-1 space-y-1.5">
        <p className="text-sm font-medium" style={{ color: "var(--ll-text)" }}>
          Activá las notificaciones push
        </p>
        <p className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
          Te avisamos cuando una publicación está por salir, se publica con éxito, o falla. También
          el aviso del tap final de TikTok.
        </p>
        <div className="flex gap-2 pt-1">
          <Button
            variant="brand"
            size="sm"
            disabled={busy}
            onClick={() => void subscribe()}
            className="h-7 px-3 text-xs"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bell className="h-3 w-3" />}
            Activar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-7 px-3 text-xs text-[var(--ll-text-muted)]"
          >
            Más tarde
          </Button>
        </div>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="rounded p-1 text-[var(--ll-text-dim)] hover:bg-[var(--ll-surface-2)]"
        aria-label="Cerrar"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
