import { useQuery } from "@tanstack/react-query";
import { fetchShapes } from "@/lib/api/shapes";

export function useShapes() {
  return useQuery({
    queryKey: ["shapes"],
    queryFn: fetchShapes,
    staleTime: 60_000,
  });
}
