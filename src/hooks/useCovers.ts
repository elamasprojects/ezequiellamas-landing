import { useQuery } from "@tanstack/react-query";
import { fetchCovers, fetchCover, type CoverWithRelations } from "@/lib/api/covers";

export function useCovers() {
  return useQuery({
    queryKey: ["covers"],
    queryFn: fetchCovers,
    staleTime: 30_000,
  });
}

export function useCover(id: string | undefined) {
  return useQuery<CoverWithRelations | null>({
    queryKey: ["cover", id],
    queryFn: () => fetchCover(id!),
    enabled: !!id,
    staleTime: 10_000,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "generating" || status === "editing" ? 3000 : false;
    },
  });
}
