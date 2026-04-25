import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LogOut, Menu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { NavItem } from "@/components/app/DashboardShell";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/api/roles";

interface Props {
  role: AppRole;
  roleLabel: string;
  navItems: NavItem[];
}

export default function MobileNav({ role, roleLabel, navItems }: Props) {
  const [open, setOpen] = useState(false);
  const { user } = useSession();
  const navigate = useNavigate();

  async function signOut() {
    setOpen(false);
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Abrir menú"
          className="md:hidden text-[var(--ll-text-muted)] hover:bg-[var(--ll-surface)] hover:text-[var(--ll-text)]"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="border-r border-[var(--ll-border)] bg-[var(--ll-bg)] p-0 text-[var(--ll-text)] sm:max-w-xs"
      >
        <div
          className="flex items-center gap-3 border-b border-[var(--ll-border)] px-5 py-4"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          <span className="text-base">
            Ezequiel <span style={{ color: "var(--ll-accent)" }}>Lamas</span>
          </span>
          <Badge variant={role}>{roleLabel}</Badge>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end ?? false}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-3 text-sm transition-colors",
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

        <div
          className="absolute inset-x-0 bottom-0 border-t border-[var(--ll-border)] p-4"
          style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
        >
          {user?.email && (
            <div
              className="mb-3 truncate text-xs"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: "var(--ll-text-muted)",
              }}
            >
              {user.email}
            </div>
          )}
          <SheetClose asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="w-full border-[var(--ll-border)] text-[var(--ll-text-muted)] hover:bg-[var(--ll-surface)] hover:text-[var(--ll-text)]"
            >
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
