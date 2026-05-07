import { useQuery } from "@tanstack/react-query";
import { fetchCoverAssets } from "@/lib/api/coverAssets";

export function useCoverAssets() {
  return useQuery({
    queryKey: ["cover_assets"],
    queryFn: fetchCoverAssets,
    staleTime: 60_000,
  });
}
