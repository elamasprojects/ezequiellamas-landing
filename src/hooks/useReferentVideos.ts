import { useQuery } from "@tanstack/react-query";
import { fetchReferentVideos, fetchAllReferentVideos } from "@/lib/api/referents";

export function useReferentVideos(referentId: string | undefined) {
  return useQuery({
    queryKey: ["referent-videos", referentId],
    queryFn: () => fetchReferentVideos(referentId!),
    enabled: !!referentId,
    staleTime: 30_000,
  });
}

// Global feed: every referent's videos, best metrics first.
export function useAllReferentVideos() {
  return useQuery({
    queryKey: ["referent-videos", "all"],
    queryFn: () => fetchAllReferentVideos(),
    staleTime: 30_000,
  });
}
