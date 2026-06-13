import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LogOut, Menu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { NavItem } from "@/components/app/DashboardShell";
import { buildSections } from "@/components/app/navSections";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/api/roles";

interface Props {
  role: AppRole;
  roleLabel: string;
  navItems: NavItem[];
}

// Mobile menu: a bottom-sheet GALLERY (3 tiles per row, icon + title) instead of
// a long vertical sidebar list — easier to scan on a phone.
export default function MobileNav({ role, roleLabel, navItems }: Props) {
  const [open, setOpen] = useState(false);
  const { user } = useSession();
  const navigate = useNavigate();

  const priorityItems = navItems.filter((i) => i.priority);
  const sections = buildSections(navItems.filter((i) => !i.priority));

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
        side="bottom"
        className="max-h-[88vh] overflow-y-auto rounded-t-2xl border-[var(--ll-border)] bg-[var(--ll-bg)] p-0 text-[var(--ll-text)]"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <SheetHeader className="border-b border-[var(--ll-border)] px-5 py-4 text-left">
          <SheetTitle
            className="flex items-center gap-3 text-base font-normal"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            <span>
              Ezequiel <span style={{ color: "var(--ll-accent)" }}>Lamas</span>
            </span>
            <Badge variant={role}>{roleLabel}</Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-3 p-3">
          {/* Priority entries first */}
          {priorityItems.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {priorityItems.map((item) => (
                <Tile key={item.to ?? item.label} item={item} onNavigate={() => setOpen(false)} priority />
              ))}
            </div>
          )}

          {/* Grouped sections */}
          {sections.map((section, i) => (
            <div key={section.label ?? `_${i}`} className="space-y-2">
              {section.label && (
                <div
                  className="px-1 text-[10px] uppercase tracking-[0.18em] text-[var(--ll-text-dim)]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {section.label}
                </div>
              )}
              <nav className="grid grid-cols-3 gap-2">
                {section.items.map((item) => (
                  <Tile key={item.to ?? item.label} item={item} onNavigate={() => setOpen(false)} />
                ))}
              </nav>
            </div>
          ))}
        </div>

        <div className="px-3 pb-2">
          {user?.email && (
            <div
              className="mb-2 truncate px-1 text-xs"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
            >
              {user.email}
            </div>
          )}
          <Button
            variant="outline"
            onClick={signOut}
            className="w-full border-[var(--ll-border)] text-[var(--ll-text-muted)] hover:bg-[var(--ll-surface)] hover:text-[var(--ll-text)]"
          >
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** A mobile gallery tile: a NavLink, or a button for action items (`onClick`). */
function Tile({
  item,
  onNavigate,
  priority = false,
}: {
  item: NavItem;
  onNavigate: () => void;
  priority?: boolean;
}) {
  const base =
    "relative flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-xl border p-2 text-center transition-colors [&_svg]:h-6 [&_svg]:w-6";
  const priorityCls = "border-[var(--ll-accent)] bg-[var(--ll-accent-dim)] text-[var(--ll-accent)]";

  if (item.onClick && !item.to) {
    return (
      <button
        type="button"
        onClick={() => {
          onNavigate();
          item.onClick!();
        }}
        className={cn(base, priority ? priorityCls : "border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text-muted)] active:bg-[var(--ll-surface-2)]")}
      >
        {item.icon}
        <span className="text-[11px] leading-tight">{item.label}</span>
      </button>
    );
  }

  return (
    <NavLink
      to={item.to!}
      end={item.end ?? false}
      onClick={() => !item.disabled && onNavigate()}
      className={({ isActive }) =>
        cn(
          base,
          item.disabled && "pointer-events-none opacity-40",
          isActive || priority
            ? priorityCls
            : "border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text-muted)] active:bg-[var(--ll-surface-2)]",
        )
      }
    >
      {item.icon}
      <span className="text-[11px] leading-tight">{item.label}</span>
      {item.disabled && (
        <span
          className="absolute right-1.5 top-1.5 rounded-full border border-[var(--ll-border)] px-1 py-0.5 text-[8px] uppercase tracking-wider"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          Pronto
        </span>
      )}
    </NavLink>
  );
}
