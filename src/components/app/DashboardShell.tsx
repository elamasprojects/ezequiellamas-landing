import { type ReactNode, useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import MobileNav from "@/components/app/MobileNav";
import NotificationBell from "@/components/app/NotificationBell";
import PushPrompt from "@/components/app/PushPrompt";
import InstallPrompt from "@/components/app/InstallPrompt";
import OfflineBanner from "@/components/app/OfflineBanner";
import BottomTabBar from "@/components/app/BottomTabBar";
import QuickCaptureSheet from "@/components/app/QuickCaptureSheet";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { buildSections } from "@/components/app/navSections";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/api/roles";

export interface NavItem {
  /** Destination route. Omit for action items (use `onClick`). */
  to?: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  end?: boolean;
  /** Section label — consecutive items sharing a group render under one collapsible header. */
  group?: string;
  /** Standout entry, rendered above the groups (desktop). */
  priority?: boolean;
  /** Action item (e.g. open a modal) instead of navigating. */
  onClick?: () => void;
}

/** Groups collapsed by default on first load (admin). */
const DEFAULT_COLLAPSED: Record<string, boolean> = { Producir: true };

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
  const [collapsed, setCollapsed] = useLocalStorage<Record<string, boolean>>(
    `ll.nav.collapsed.${role}`,
    DEFAULT_COLLAPSED,
  );
  // Desktop sidebar auto-expands on hover/focus and collapses to an icon-only
  // rail otherwise — no manual toggle.
  const [expanded, setExpanded] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const openRail = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setExpanded(true);
  };
  const closeRail = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setExpanded(false), 150);
  };
  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  // The thumb-zone bottom bar + quick-capture are the admin creator surface.
  const showBottomBar = role === "admin";

  const priorityItems = navItems.filter((i) => i.priority);
  const sections = buildSections(navItems.filter((i) => !i.priority));
  const avatarInitial = (user?.email?.charAt(0) ?? "U").toUpperCase();

  function toggleGroup(label: string) {
    setCollapsed((c) => ({ ...c, [label]: !c[label] }));
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  }

  return (
    <div
      className="min-h-screen text-[var(--ll-text)]"
      style={{ background: "var(--ll-bg)", fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Mobile-only top bar (desktop uses the sidebar for brand + profile). */}
      <header
        className="sticky top-0 z-40 border-b border-[var(--ll-border)] bg-[var(--ll-bg)]/85 backdrop-blur md:hidden"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex h-14 items-center justify-between px-3">
          <div className="flex items-center gap-2">
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
          <NotificationBell />
        </div>
      </header>

      {/* Desktop sidebar: fixed icon rail that expands to full width on hover/focus. */}
      <aside
        aria-label="Navegación principal"
        onMouseEnter={openRail}
        onMouseLeave={closeRail}
        onFocusCapture={openRail}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) closeRail();
        }}
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-[var(--ll-border)] bg-[var(--ll-bg)] transition-[width] duration-200 ease-in-out md:flex",
          expanded ? "w-60" : "w-16",
        )}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        {/* Brand (top, aligned with the rail) */}
        <Link
          to="/"
          className={cn(
            "flex h-14 shrink-0 items-center border-b border-[var(--ll-border)]",
            expanded ? "gap-2 px-4" : "justify-center px-0",
          )}
        >
          {expanded ? (
            <>
              <span
                className="truncate text-base"
                style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}
              >
                Ezequiel <span style={{ color: "var(--ll-accent)" }}>Lamas</span>
              </span>
              <Badge variant={role} className="ml-auto shrink-0">
                {roleLabel}
              </Badge>
            </>
          ) : (
            <span className="text-lg leading-none" style={{ fontFamily: "'Instrument Serif', serif" }}>
              E<span style={{ color: "var(--ll-accent)" }}>L</span>
            </span>
          )}
        </Link>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden p-3">
          {/* Standout priority entries */}
          {priorityItems.length > 0 && (
            <div className="mb-2 flex flex-col gap-1.5">
              {priorityItems.map((item) => (
                <NavRow key={item.to ?? item.label} item={item} priority collapsed={!expanded} />
              ))}
            </div>
          )}

          {/* Grouped sections. Collapsed rail shows every icon (no headers, no per-group collapse). */}
          {sections.map((section, i) => {
            const groupCollapsed = section.label != null && collapsed[section.label];
            return (
              <div key={section.label ?? `_${i}`} className="flex flex-col gap-1">
                {section.label && expanded && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(section.label!)}
                    className="mt-2 flex w-full items-center justify-between px-3 pb-0.5 pt-1 text-[10px] uppercase tracking-[0.18em] text-[var(--ll-text-dim)] transition-colors hover:text-[var(--ll-text-muted)]"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    <span>{section.label}</span>
                    <ChevronDown
                      className={cn("h-3 w-3 transition-transform", groupCollapsed && "-rotate-90")}
                    />
                  </button>
                )}
                {!expanded && i > 0 && (
                  <div className="mx-auto my-1 h-px w-6 bg-[var(--ll-border)]" aria-hidden />
                )}
                {(!expanded || !groupCollapsed) &&
                  section.items.map((item) => (
                    <NavRow key={item.to ?? item.label} item={item} collapsed={!expanded} />
                  ))}
              </div>
            );
          })}
        </nav>

        {/* Footer: notifications + profile + logout */}
        <div className="flex shrink-0 flex-col gap-1 border-t border-[var(--ll-border)] p-2">
          <div className={cn("flex", expanded ? "px-1" : "justify-center")}>
            <NotificationBell />
          </div>
          <div
            className={cn(
              "flex items-center rounded-md",
              expanded ? "gap-2 px-1.5 py-1" : "justify-center py-1",
            )}
          >
            <span
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[var(--ll-border)] bg-[var(--ll-surface)] text-xs font-semibold text-[var(--ll-text)]"
              aria-hidden
            >
              {avatarInitial}
            </span>
            {expanded && (
              <>
                <span
                  className="min-w-0 flex-1 truncate text-xs text-[var(--ll-text-muted)]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  title={user?.email ?? undefined}
                >
                  {user?.email}
                </span>
                <button
                  type="button"
                  onClick={signOut}
                  aria-label="Salir"
                  title="Salir"
                  className="shrink-0 rounded-md p-1.5 text-[var(--ll-text-muted)] transition-colors hover:bg-[var(--ll-surface)] hover:text-[var(--ll-text)]"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Content column — offset by the collapsed rail; the expanded rail overlays it. */}
      <div className="md:ml-16">
        <OfflineBanner />
        <main
          className={cn(
            "px-4 py-6 md:px-10 md:py-8",
            // Clear the bottom bar (mobile only; desktop has the sidebar).
            showBottomBar
              ? "pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-8"
              : "pb-[calc(2rem+env(safe-area-inset-bottom,0px))]",
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

/** A single sidebar entry: a NavLink, or a button for action items (`onClick`). */
function NavRow({
  item,
  priority = false,
  collapsed = false,
}: {
  item: NavItem;
  priority?: boolean;
  collapsed?: boolean;
}) {
  const content = collapsed ? (
    item.icon ?? (
      <span className="grid h-[18px] w-[18px] place-items-center text-[11px] font-semibold">
        {item.label.charAt(0)}
      </span>
    )
  ) : (
    <>
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
    </>
  );

  // In the collapsed rail, center the icon and drop the label/horizontal padding;
  // a native tooltip surfaces the label on hover.
  const priorityClass = cn(
    "flex items-center rounded-md border border-[var(--ll-accent)]/40 bg-[var(--ll-accent-dim)] font-medium text-[var(--ll-accent)] transition-colors hover:bg-[var(--ll-accent)]/20 [&_svg]:h-[18px] [&_svg]:w-[18px]",
    collapsed ? "justify-center px-0 py-2.5" : "gap-2 px-3 py-2.5 text-sm",
  );
  const regularClass = cn(
    "flex items-center rounded-md text-sm transition-colors",
    collapsed ? "justify-center px-0 py-2" : "gap-2 px-3 py-2",
  );
  const title = collapsed ? item.label : undefined;

  // Action item (no route) → button.
  if (item.onClick && !item.to) {
    return (
      <button
        type="button"
        onClick={item.onClick}
        title={title}
        className={cn(
          priority
            ? priorityClass
            : cn(regularClass, "text-[var(--ll-text-muted)] hover:bg-[var(--ll-surface)] hover:text-[var(--ll-text)]"),
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <NavLink
      to={item.to!}
      end={item.end ?? false}
      title={title}
      className={({ isActive }) =>
        cn(
          priority ? priorityClass : regularClass,
          item.disabled && "pointer-events-none opacity-40",
          !priority &&
            (isActive
              ? "bg-[var(--ll-surface-2)] text-[var(--ll-accent)]"
              : "text-[var(--ll-text-muted)] hover:bg-[var(--ll-surface)] hover:text-[var(--ll-text)]"),
          priority && isActive && "ring-1 ring-[var(--ll-accent)]",
        )
      }
    >
      {content}
    </NavLink>
  );
}
