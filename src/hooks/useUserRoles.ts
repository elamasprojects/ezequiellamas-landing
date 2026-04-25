import { useQuery } from "@tanstack/react-query";
import { fetchUserRoles, type AppRole } from "@/lib/api/roles";
import { useSession } from "@/hooks/useSession";

export function useUserRoles() {
  const { user, loading: sessionLoading } = useSession();
  const query = useQuery({
    queryKey: ["user_roles", user?.id],
    queryFn: () => fetchUserRoles(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  return {
    roles: query.data ?? [],
    loading: sessionLoading || (!!user?.id && query.isPending),
    refetch: query.refetch,
    hasRole: (role: AppRole) => (query.data ?? []).includes(role),
  };
}
