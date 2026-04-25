import { useQuery } from "@tanstack/react-query";
import { fetchVideos, type VideoFilters } from "@/lib/api/videos";

export function useVideos(filters: VideoFilters = {}) {
  return useQuery({
    queryKey: ["videos", filters],
    queryFn: () => fetchVideos(filters),
    staleTime: 30_000,
  });
}
