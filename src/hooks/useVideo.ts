import { useQuery } from "@tanstack/react-query";
import { fetchVideo } from "@/lib/api/videos";

export function useVideo(id: string | undefined) {
  return useQuery({
    queryKey: ["video", id],
    queryFn: () => fetchVideo(id!),
    enabled: !!id,
    staleTime: 10_000,
  });
}
