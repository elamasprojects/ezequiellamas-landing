import { useQuery } from "@tanstack/react-query";
import { fetchReferents } from "@/lib/api/referents";

export function useReferents() {
  return useQuery({
    queryKey: ["referents"],
    queryFn: fetchReferents,
    staleTime: 60_000,
  });
}
