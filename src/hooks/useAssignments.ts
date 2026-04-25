import { useQuery } from "@tanstack/react-query";
import { fetchAssignment, fetchAssignments } from "@/lib/api/assignments";

export function useAssignments() {
  return useQuery({
    queryKey: ["assignments"],
    queryFn: fetchAssignments,
    staleTime: 15_000,
  });
}

export function useAssignment(id: string | undefined) {
  return useQuery({
    queryKey: ["assignment", id],
    queryFn: () => fetchAssignment(id!),
    enabled: !!id,
    staleTime: 5_000,
  });
}
