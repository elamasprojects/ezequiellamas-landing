import { useQuery } from "@tanstack/react-query";
import { fetchCreatorProfile } from "@/lib/api/creatorProfile";

export function useCreatorProfile() {
  return useQuery({
    queryKey: ["creator_profile"],
    queryFn: fetchCreatorProfile,
    staleTime: 60_000,
  });
}
