import { useQuery } from "@tanstack/react-query";
import { fetchSeries } from "@/lib/api/series";

export function useSeries() {
  return useQuery({
    queryKey: ["series"],
    queryFn: fetchSeries,
    staleTime: 60_000,
  });
}
