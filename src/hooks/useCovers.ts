import { useQuery } from "@tanstack/react-query";
import {
  fetchCovers,
  fetchCover,
  getSignedCoverUrl,
  type CoverWithRelations,
} from "@/lib/api/covers";

export function useCovers() {
  return useQuery({
    queryKey: ["covers"],
    queryFn: fetchCovers,
    staleTime: 30_000,
    refetchOnMount: "always",
  });
}

export function useCover(id: string | undefined) {
  return useQuery<CoverWithRelations | null>({
    queryKey: ["cover", id],
    queryFn: () => fetchCover(id!),
    enabled: !!id,
    staleTime: 10_000,
    refetchOnMount: "always",
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "generating" || status === "editing" ? 3000 : false;
    },
  });
}

// Firma on-demand una URL de cover-renders. Cache 30min (URLs viven 4h).
// Devuelve null mientras se firma o si no hay path; usar fallback en consumer.
export function useCoverImageUrl(storagePath: string | null | undefined) {
  return useQuery({
    queryKey: ["cover-img", storagePath],
    queryFn: () => getSignedCoverUrl(storagePath!),
    enabled: !!storagePath,
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    retry: 1,
  });
}
