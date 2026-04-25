import { Navigate, Outlet } from "react-router-dom";
import { useUserRoles } from "@/hooks/useUserRoles";
import type { AppRole } from "@/lib/api/roles";
import LoadingScreen from "@/components/app/LoadingScreen";

export default function RequireRole({ role }: { role: AppRole }) {
  const { hasRole, loading } = useUserRoles();
  if (loading) return <LoadingScreen />;
  if (!hasRole(role)) return <Navigate to="/app" replace />;
  return <Outlet />;
}
