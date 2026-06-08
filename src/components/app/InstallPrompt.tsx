import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "ll.install_prompt_dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const isIos = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

// Dismissible "install the app" banner. Android/desktop Chrome fire
// beforeinstallprompt → one-tap install; iOS Safari can't, so we show a hint to
// use Share → "Agregar a inicio".
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === "1");

  useEffect(() => {
    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  // Already installed (standalone) → nothing to do.
  const standalone = typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true);

  const showNative = !!deferred;
  const showIos = isIos && !deferred;
  if (dismissed || standalone || (!showNative && !showIos)) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="mb-6 flex items-center gap-3 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-3">
      {showIos ? <Share className="h-5 w-5 shrink-0" style={{ color: "var(--ll-accent)" }} /> : <Download className="h-5 w-5 shrink-0" style={{ color: "var(--ll-accent)" }} />}
      <div className="min-w-0 flex-1">
        <p className="text-sm" style={{ color: "var(--ll-text)" }}>Instalá la app</p>
        <p className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
          {showIos
            ? "Tocá Compartir y elegí «Agregar a inicio» para acceso directo a pantalla completa."
            : "Acceso directo + pantalla completa para capturar ideas al vuelo."}
        </p>
      </div>
      {showNative && (
        <Button variant="brand" size="sm" onClick={install}>Instalar</Button>
      )}
      <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--ll-text-muted)]" onClick={dismiss} aria-label="Descartar">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
