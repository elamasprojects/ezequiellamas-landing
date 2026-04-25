import { useQuery } from "@tanstack/react-query";
import { fetchFormats } from "@/lib/api/formats";

export function useFormats() {
  return useQuery({
    queryKey: ["formats"],
    queryFn: fetchFormats,
    staleTime: 60_000,
  });
}
