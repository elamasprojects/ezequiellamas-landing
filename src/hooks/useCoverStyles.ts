import { useQuery } from "@tanstack/react-query";
import { fetchCoverStyles } from "@/lib/api/coverStyles";

export function useCoverStyles() {
  return useQuery({
    queryKey: ["cover_styles"],
    queryFn: fetchCoverStyles,
    staleTime: 60_000,
  });
}
