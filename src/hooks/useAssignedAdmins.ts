import { useQuery } from "@tanstack/react-query";
import { fetchActiveAdminsForAdvisor } from "@/lib/api/advisorAssignments";
import { useSession } from "@/hooks/useSession";

export function useAssignedAdmins() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["assigned_admins", user?.id],
    queryFn: () => fetchActiveAdminsForAdvisor(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  });
}
