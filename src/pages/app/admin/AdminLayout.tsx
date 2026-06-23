import { useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Lightbulb,
  FileText,
  Video,
  ClipboardList,
  BookOpen,
  LayoutGrid,
  Megaphone,
  MessagesSquare,
  Compass,
  Wand2,
  Settings,
  Youtube,
  Plus,
} from "lucide-react";
import DashboardShell, { type NavItem } from "@/components/app/DashboardShell";
import NewIdeaModal from "@/components/app/NewIdeaModal";

function buildNav(openIdeaModal: () => void): NavItem[] {
  return [
    // ── Priority (standout, above everything) ──
    { label: "Nueva idea", icon: <Plus className="h-4 w-4" />, onClick: openIdeaModal, priority: true },
    { to: "/app/admin/publishing", label: "Publicar", icon: <Megaphone className="h-4 w-4" />, priority: true },

    // ── Inicio ──
    { to: "/app/admin", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, end: true, group: "Inicio" },

    // ── Crear ──
    { to: "/app/admin/crear", label: "Crear de ideas", icon: <Wand2 className="h-4 w-4" />, group: "Crear" },
    { to: "/app/admin/ideas", label: "Ideas", icon: <Lightbulb className="h-4 w-4" />, group: "Crear" },
    { to: "/app/admin/guiones", label: "Guiones", icon: <FileText className="h-4 w-4" />, group: "Crear" },
    { to: "/app/admin/referentes", label: "Referentes", icon: <Compass className="h-4 w-4" />, group: "Crear" },

    // ── Producir ──
    { to: "/app/admin/youtube", label: "YouTube", icon: <Youtube className="h-4 w-4" />, group: "Producir" },
    { to: "/app/admin/carousels", label: "Carruseles", icon: <LayoutGrid className="h-4 w-4" />, group: "Producir" },
    { to: "/app/admin/videos", label: "Videos", icon: <Video className="h-4 w-4" />, group: "Producir" },

    // ── Distribuir ──
    { to: "/app/admin/resources", label: "Recursos", icon: <BookOpen className="h-4 w-4" />, group: "Distribuir" },
    { to: "/app/admin/engagement", label: "Interacciones", icon: <MessagesSquare className="h-4 w-4" />, group: "Distribuir" },
    { to: "/app/admin/assignments", label: "Asignaciones", icon: <ClipboardList className="h-4 w-4" />, group: "Distribuir" },

    // ── Ajustes ──
    { to: "/app/admin/settings", label: "Configuración", icon: <Settings className="h-4 w-4" />, group: "Ajustes" },
  ];
}

export default function AdminLayout() {
  const [ideaModalOpen, setIdeaModalOpen] = useState(false);
  const nav = useMemo(() => buildNav(() => setIdeaModalOpen(true)), []);

  return (
    <>
      <DashboardShell role="admin" roleLabel="Admin" navItems={nav}>
        <Outlet />
      </DashboardShell>
      <NewIdeaModal open={ideaModalOpen} onOpenChange={setIdeaModalOpen} />
    </>
  );
}
