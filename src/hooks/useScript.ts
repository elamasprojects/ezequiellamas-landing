import { useQuery } from "@tanstack/react-query";
import { fetchScript } from "@/lib/api/scripts";

export function useScript(id: string | undefined) {
  return useQuery({
    queryKey: ["script", id],
    queryFn: () => fetchScript(id!),
    enabled: !!id,
    staleTime: 10_000,
  });
}
