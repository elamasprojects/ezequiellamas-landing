import { useQuery } from "@tanstack/react-query";
import { fetchReferent } from "@/lib/api/referents";

export function useReferent(id: string | undefined) {
  return useQuery({
    queryKey: ["referent", id],
    queryFn: () => fetchReferent(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}
