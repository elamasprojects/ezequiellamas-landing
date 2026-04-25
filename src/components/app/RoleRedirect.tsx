import { Navigate } from "react-router-dom";
import { useUserRoles } from "@/hooks/useUserRoles";
import LoadingScreen from "@/components/app/LoadingScreen";
import NoRoleAssigned from "@/components/app/NoRoleAssigned";

export default function RoleRedirect() {
  const { roles, loading } = useUserRoles();
  if (loading) return <LoadingScreen />;
  if (roles.includes("admin")) return <Navigate to="/app/admin" replace />;
  if (roles.includes("editor")) return <Navigate to="/app/editor" replace />;
  if (roles.includes("advisor")) return <Navigate to="/app/advisor" replace />;
  return <NoRoleAssigned />;
}
