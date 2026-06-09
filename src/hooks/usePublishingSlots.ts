import { useQuery } from "@tanstack/react-query";
import { fetchPublishingSlots } from "@/lib/api/publishingSlots";

export function usePublishingSlots() {
  return useQuery({
    queryKey: ["publishing-slots"],
    queryFn: fetchPublishingSlots,
    staleTime: 60_000,
  });
}
