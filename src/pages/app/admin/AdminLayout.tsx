import { Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Lightbulb,
  Library,
  Video,
  Calendar,
  ClipboardList,
  BookOpen,
  Users,
  LayoutGrid,
  Megaphone,
  MessagesSquare,
  Compass,
  Film,
  ImagePlay,
  Sparkles,
  Wand2,
  Settings,
  Youtube,
} from "lucide-react";
import DashboardShell, { type NavItem } from "@/components/app/DashboardShell";

const NAV: NavItem[] = [
  { to: "/app/admin", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, end: true },
  { to: "/app/admin/crear", label: "Crear de ideas", icon: <Wand2 className="h-4 w-4" /> },
  { to: "/app/admin/studio", label: "YouTube Studio", icon: <Film className="h-4 w-4" /> },
  { to: "/app/admin/ideas", label: "Idea → Guion", icon: <Lightbulb className="h-4 w-4" /> },
  { to: "/app/admin/formats", label: "Formatos", icon: <Library className="h-4 w-4" /> },
  { to: "/app/admin/videos", label: "Videos", icon: <Video className="h-4 w-4" /> },
  { to: "/app/admin/calendar", label: "Calendario", icon: <Calendar className="h-4 w-4" /> },
  { to: "/app/admin/publishing", label: "Publicaciones", icon: <Megaphone className="h-4 w-4" /> },
  { to: "/app/admin/engagement", label: "Interacciones", icon: <MessagesSquare className="h-4 w-4" /> },
  { to: "/app/admin/assignments", label: "Asignaciones", icon: <ClipboardList className="h-4 w-4" /> },
  { to: "/app/admin/resources", label: "Recursos", icon: <BookOpen className="h-4 w-4" /> },
  { to: "/app/admin/referentes", label: "Referentes", icon: <Compass className="h-4 w-4" /> },
  { to: "/app/admin/youtube", label: "Mi YouTube", icon: <Youtube className="h-4 w-4" /> },
  { to: "/app/admin/carousels", label: "Carruseles", icon: <LayoutGrid className="h-4 w-4" /> },
  { to: "/app/admin/animations", label: "Animations", icon: <Sparkles className="h-4 w-4" /> },
  { to: "/app/admin/motion-graphics", label: "Motion Graphics", icon: <Wand2 className="h-4 w-4" /> },
  { to: "/app/admin/brolls", label: "B-rolls", icon: <Film className="h-4 w-4" /> },
  { to: "/app/admin/covers", label: "Portadas", icon: <ImagePlay className="h-4 w-4" /> },
  { to: "/app/admin/settings", label: "Perfil & IA", icon: <Settings className="h-4 w-4" /> },
  { to: "/app/admin/team", label: "Equipo", icon: <Users className="h-4 w-4" /> },
];

export default function AdminLayout() {
  return (
    <DashboardShell role="admin" roleLabel="Admin" navItems={NAV}>
      <Outlet />
    </DashboardShell>
  );
}
