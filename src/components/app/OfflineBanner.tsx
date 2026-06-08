import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

// A slim banner shown while offline. The app shell is cached (PWA), so the UI
// stays usable; this just sets expectations that actions won't go through.
export default function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div
      className="flex items-center justify-center gap-2 border-b border-[var(--ll-border)] px-3 py-1.5 text-xs"
      style={{ background: "var(--ll-warm-dim)", color: "var(--ll-warm)" }}
      role="status"
    >
      <WifiOff className="h-3.5 w-3.5" />
      Sin conexión — los cambios no se van a guardar hasta que vuelvas a estar online.
    </div>
  );
}
