import { useQuery } from "@tanstack/react-query";
import { fetchAnalyzedReferentVideos } from "@/lib/api/referents";

// (M23) Analyzed virals usable as ingredients in "Crear a partir de ideas".
export function useAnalyzedReferentVideos() {
  return useQuery({
    queryKey: ["analyzed_referent_videos"],
    queryFn: fetchAnalyzedReferentVideos,
    staleTime: 60_000,
  });
}
