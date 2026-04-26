import { useQuery } from "@tanstack/react-query";
import { fetchResource } from "@/lib/api/resources";

export function useResource(id: string | undefined) {
  return useQuery({
    queryKey: ["resource", id],
    queryFn: () => fetchResource(id!),
    enabled: !!id,
    staleTime: 10_000,
  });
}
