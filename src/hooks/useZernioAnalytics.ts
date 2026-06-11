import { useQuery } from "@tanstack/react-query";
import {
  fetchAccountStats,
  fetchFollowerSeries,
  fetchRecentPostAnalytics,
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
