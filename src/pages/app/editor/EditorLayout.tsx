import { Outlet } from "react-router-dom";
import { LayoutDashboard, Wallet } from "lucide-react";
import DashboardShell, { type NavItem } from "@/components/app/DashboardShell";

const NAV: NavItem[] = [
  { to: "/app/editor", label: "Cola de trabajo", icon: <LayoutDashboard className="h-4 w-4" />, end: true },
  { to: "/app/editor/earnings", label: "Ganancias", icon: <Wallet className="h-4 w-4" />, disabled: true },
];

export default function EditorLayout() {
  return (
    <DashboardShell role="editor" roleLabel="Editor" navItems={NAV}>
      <Outlet />
    </DashboardShell>
  );
}
