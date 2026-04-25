import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/hooks/useNotifications";
import { markAllRead, markNotificationRead } from "@/lib/api/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export default function NotificationBell() {
  const { all, unread } = useNotifications();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  async function handleClick(id: string, link: string | null) {
    await markNotificationRead(id).catch(() => {});
    qc.invalidateQueries({ queryKey: ["notifications"] });
    setOpen(false);
    if (link) window.location.href = link;
  }

  async function handleMarkAll() {
    await markAllRead().catch(() => {});
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notificaciones"
          className="relative text-[var(--ll-text-muted)] hover:bg-[var(--ll-surface)] hover:text-[var(--ll-text)]"
        >
          <Bell className="h-5 w-5" />
          {unread.length > 0 && (
            <span
              className="absolute right-1.5 top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none"
              style={{ background: "var(--ll-accent)", color: "#0a0a0a", fontFamily: "'JetBrains Mono', monospace" }}
            >
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]"
      >
        <div className="flex items-center justify-between px-2 py-1">
          <DropdownMenuLabel className="px-0">Notificaciones</DropdownMenuLabel>
          {unread.length > 0 && (
            <button
              onClick={handleMarkAll}
              className="text-[10px] uppercase tracking-wider"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: "var(--ll-text-muted)",
              }}
            >
              <Check className="inline h-3 w-3" /> Todas leídas
            </button>
          )}
        </div>
        <DropdownMenuSeparator className="bg-[var(--ll-border)]" />
        {all.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm" style={{ color: "var(--ll-text-muted)" }}>
            Sin notificaciones todavía.
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {all.slice(0, 20).map((n) => (
              <DropdownMenuItem
                key={n.id}
                onSelect={(e) => {
                  e.preventDefault();
                  handleClick(n.id, n.link);
                }}
                className={cn(
                  "flex flex-col items-start gap-0.5 px-3 py-2",
                  !n.read_at && "bg-[var(--ll-surface-2)]",
                )}
              >
                <div className="flex w-full items-center gap-2">
                  {!n.read_at && (
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: "var(--ll-accent)" }}
                    />
                  )}
                  <span className="flex-1 truncate text-sm font-medium" style={{ color: "var(--ll-text)" }}>
                    {n.title}
                  </span>
                </div>
                {n.body && (
                  <span
                    className="line-clamp-2 pl-3.5 text-xs"
                    style={{ color: "var(--ll-text-muted)" }}
                  >
                    {n.body}
                  </span>
                )}
                <span
                  className="pl-3.5 text-[10px]"
                  style={{ color: "var(--ll-text-dim)", fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {new Date(n.created_at).toLocaleString("es-AR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </DropdownMenuItem>
            ))}
          </div>
        )}
        <DropdownMenuSeparator className="bg-[var(--ll-border)]" />
        <DropdownMenuItem asChild>
          <Link to="/app" className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
            Ir al dashboard
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
