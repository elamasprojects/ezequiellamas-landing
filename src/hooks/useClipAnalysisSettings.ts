import { useQuery } from "@tanstack/react-query";
import { fetchClipAnalysisSettings } from "@/lib/api/clipAnalysisSettings";

export function useClipAnalysisSettings() {
  return useQuery({
    queryKey: ["clip-analysis-settings"],
    queryFn: fetchClipAnalysisSettings,
    staleTime: 60_000,
  });
}
