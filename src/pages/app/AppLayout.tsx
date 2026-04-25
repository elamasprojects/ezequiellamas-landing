import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "@/hooks/useSession";
import LoadingScreen from "@/components/app/LoadingScreen";

export default function AppLayout() {
  const { session, loading } = useSession();
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}
