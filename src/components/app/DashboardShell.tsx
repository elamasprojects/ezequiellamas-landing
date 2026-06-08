import { type ReactNode, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import MobileNav from "@/components/app/MobileNav";
import NotificationBell from "@/components/app/NotificationBell";
import PushPrompt from "@/components/app/PushPrompt";
import InstallPrompt from "@/components/app/InstallPrompt";
import BottomTabBar from "@/components/app/BottomTabBar";
import QuickCaptureSheet from "@/components/app/QuickCaptureSheet";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/api/roles";

export interface NavItem {
  to: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  end?: boolean;
}

interface Props {
  role: AppRole;
  roleLabel: string;
  navItems: NavItem[];
  children: ReactNode;
}

export default function DashboardShell({ role, roleLabel, navItems, children }: Props) {
  const { user } = useSession();
  const navigate = useNavigate();
  const [captureOpen, setCaptureOpen] = useState(false);
  // The thumb-zone bottom bar + quick-capture are the admin creator surface.
  const showBottomBar = role === "admin";

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  }

  return (
    <div
      className="min-h-screen text-[var(--ll-text)]"
      style={{ background: "var(--ll-bg)", fontFamily: "'DM Sans', sans-serif" }}
    >
      <header
        className="sticky top-0 z-40 border-b border-[var(--ll-border)] bg-[var(--ll-bg)]/85 backdrop-blur"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex h-14 items-center justify-between px-3 md:px-6">
          <div className="flex items-center gap-2 md:gap-4">
            <MobileNav role={role} roleLabel={roleLabel} navItems={navItems} />
            <Link
              to="/"
              className="text-base"
              style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}
            >
              Ezequiel <span style={{ color: "var(--ll-accent)" }}>Lamas</span>
            </Link>
            <Badge variant={role} className="hidden sm:inline-flex">
              {roleLabel}
            </Badge>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <NotificationBell />
            <span
              className="hidden text-xs text-[var(--ll-text-muted)] md:inline"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {user?.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="hidden text-[var(--ll-text-muted)] hover:bg-[var(--ll-surface)] hover:text-[var(--ll-text)] md:inline-flex"
            >
              <LogOut className="h-4 w-4" />
              <span>Salir</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden w-60 shrink-0 border-r border-[var(--ll-border)] p-3 md:block">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end ?? false}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    item.disabled && "pointer-events-none opacity-40",
                    isActive
                      ? "bg-[var(--ll-surface-2)] text-[var(--ll-accent)]"
                      : "text-[var(--ll-text-muted)] hover:bg-[var(--ll-surface)] hover:text-[var(--ll-text)]",
                  )
                }
              >
                {item.icon}
                <span>{item.label}</span>
                {item.disabled && (
                  <span
                    className="ml-auto rounded-full border border-[var(--ll-border)] px-1.5 py-0.5 text-[9px] uppercase tracking-wider"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Pronto
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main
          className={cn(
            "flex-1 px-4 py-6 md:px-10 md:py-8",
            // Clear the bottom bar (mobile only; desktop has the sidebar).
            showBottomBar ? "pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-8" : "pb-[calc(2rem+env(safe-area-inset-bottom,0px))]",
          )}
          style={{ minWidth: 0 }}
        >
          <div className="mx-auto max-w-6xl">
            {role === "admin" && <InstallPrompt />}
            {role === "admin" && <PushPrompt />}
            {children}
          </div>
        </main>
      </div>

      {showBottomBar && (
        <>
          <BottomTabBar onCapture={() => setCaptureOpen(true)} />
          <QuickCaptureSheet open={captureOpen} onOpenChange={setCaptureOpen} />
        </>
      )}
    </div>
  );
}
