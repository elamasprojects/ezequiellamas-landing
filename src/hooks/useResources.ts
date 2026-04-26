import { useQuery } from "@tanstack/react-query";
import { fetchResources, type ResourceFilters } from "@/lib/api/resources";

export function useResources(filters: ResourceFilters = {}) {
  return useQuery({
    queryKey: ["resources", filters],
    queryFn: () => fetchResources(filters),
    staleTime: 30_000,
  });
}
