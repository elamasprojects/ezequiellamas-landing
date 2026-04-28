import { useQuery } from "@tanstack/react-query";
import { fetchReferentVideos } from "@/lib/api/referents";

export function useReferentVideos(referentId: string | undefined) {
  return useQuery({
    queryKey: ["referent-videos", referentId],
    queryFn: () => fetchReferentVideos(referentId!),
    enabled: !!referentId,
    staleTime: 30_000,
  });
}
