import { Outlet } from "react-router-dom";
import { Compass, LayoutDashboard, Library } from "lucide-react";
import DashboardShell, { type NavItem } from "@/components/app/DashboardShell";

const NAV: NavItem[] = [
  { to: "/app/advisor", label: "Videos", icon: <LayoutDashboard className="h-4 w-4" />, end: true },
  { to: "/app/advisor/formats", label: "Formatos", icon: <Library className="h-4 w-4" /> },
  { to: "/app/advisor/referentes", label: "Referentes", icon: <Compass className="h-4 w-4" /> },
];

export default function AdvisorLayout() {
  return (
    <DashboardShell role="advisor" roleLabel="Asesor" navItems={NAV}>
      <Outlet />
    </DashboardShell>
  );
}
