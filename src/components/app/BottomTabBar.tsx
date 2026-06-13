import { NavLink } from "react-router-dom";
import { Compass, type LucideIcon, Megaphone, Plus, Sparkles, Youtube } from "lucide-react";
import { cn } from "@/lib/utils";

interface Tab {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

// The four one-tap destinations (the center is the Capturar FAB).
const TABS: Tab[] = [
  { to: "/app/admin", label: "Inicio", icon: Sparkles, end: true },
  { to: "/app/admin/publishing", label: "Publicar", icon: Megaphone },
  { to: "/app/admin/crear", label: "Crear", icon: Compass },
  { to: "/app/admin/youtube", label: "YouTube", icon: Youtube },
];

// (Mobile) Thumb-zone navigation. Hidden on >= md (desktop keeps the sidebar).
export default function BottomTabBar({ onCapture }: { onCapture: () => void }) {
  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--ll-border)] bg-[var(--ll-bg)]/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Navegación principal"
    >
      <div className="grid h-16 grid-cols-5 items-center">
        {left.map((t) => <TabLink key={t.to} tab={t} />)}

        <div className="flex justify-center">
          <button
            type="button"
            onClick={onCapture}
            aria-label="Capturar idea"
            className="-mt-8 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95"
            style={{ background: "var(--ll-accent)", color: "#0a0a0a" }}
          >
            <Plus className="h-7 w-7" />
          </button>
        </div>

        {right.map((t) => <TabLink key={t.to} tab={t} />)}
      </div>
    </nav>
  );
}

function TabLink({ tab }: { tab: Tab }) {
  const Icon = tab.icon;
  return (
    <NavLink
      to={tab.to}
      end={tab.end ?? false}
      className={({ isActive }) =>
        cn(
          "flex h-full min-h-11 flex-col items-center justify-center gap-0.5 text-[10px]",
          isActive ? "text-[var(--ll-accent)]" : "text-[var(--ll-text-muted)]",
        )
      }
    >
      <Icon className="h-5 w-5" />
      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{tab.label}</span>
    </NavLink>
  );
}
