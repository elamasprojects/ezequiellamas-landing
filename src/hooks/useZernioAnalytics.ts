import { useQuery } from "@tanstack/react-query";
import {
  fetchAccountStats,
  fetchEngagementAggregate,
  fetchFollowerSeries,
  fetchRecentPostAnalytics,
  fetchUploadStreaks,
} from "@/lib/api/zernioAnalytics";

export function useZernioAccountStats() {
  return useQuery({
    queryKey: ["zernio-account-stats"],
    queryFn: fetchAccountStats,
    staleTime: 60_000,
  });
}

export function useZernioFollowerSeries(days = 90) {
  return useQuery({
    queryKey: ["zernio-follower-series", days],
    queryFn: () => fetchFollowerSeries(days),
    staleTime: 60_000,
  });
}

export function useZernioRecentPosts(limit = 12) {
  return useQuery({
    queryKey: ["zernio-recent-posts", limit],
    queryFn: () => fetchRecentPostAnalytics(limit),
    staleTime: 60_000,
  });
}

export function useEngagementAggregate(days: number) {
  return useQuery({
    queryKey: ["zernio-engagement-aggregate", days],
    queryFn: () => fetchEngagementAggregate(days),
    staleTime: 60_000,
  });
}

export function useUploadStreaks() {
  return useQuery({
    queryKey: ["zernio-upload-streaks"],
    queryFn: fetchUploadStreaks,
    staleTime: 60_000,
  });
}
