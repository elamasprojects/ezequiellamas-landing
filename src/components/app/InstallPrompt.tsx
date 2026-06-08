import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "ll.install_prompt_dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Dismissible "install the app" banner (Android/desktop Chrome fire
// beforeinstallprompt; iOS Safari doesn't, so we don't show it there).
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
      // iOS
      (window.navigator as unknown as { standalone?: boolean }).standalone === true);

  if (dismissed || standalone || !deferred) return null;

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
      <Download className="h-5 w-5 shrink-0" style={{ color: "var(--ll-accent)" }} />
      <div className="min-w-0 flex-1">
        <p className="text-sm" style={{ color: "var(--ll-text)" }}>Instalá la app</p>
        <p className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
          Acceso directo + pantalla completa para capturar ideas al vuelo.
        </p>
      </div>
      <Button variant="brand" size="sm" onClick={install}>Instalar</Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--ll-text-muted)]" onClick={dismiss} aria-label="Descartar">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
