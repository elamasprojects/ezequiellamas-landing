import { useQuery } from "@tanstack/react-query";
import { fetchFeedbackForVideo } from "@/lib/api/feedback";

export function useVideoFeedback(videoId: string | undefined) {
  return useQuery({
    queryKey: ["video_feedback", videoId],
    queryFn: () => fetchFeedbackForVideo(videoId!),
    enabled: !!videoId,
    staleTime: 15_000,
  });
}
