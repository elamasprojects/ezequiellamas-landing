import { useQuery } from "@tanstack/react-query";
import { fetchYoutubeConnection, fetchYoutubeVideos } from "@/lib/api/youtube";

export function useYoutubeConnection() {
  return useQuery({
    queryKey: ["youtube-connection"],
    queryFn: fetchYoutubeConnection,
    staleTime: 30_000,
  });
}

export function useYoutubeVideos(enabled: boolean) {
  return useQuery({
    queryKey: ["youtube-videos"],
    queryFn: fetchYoutubeVideos,
    enabled,
    staleTime: 30_000,
  });
}
