import { useQuery } from "@tanstack/react-query";
import { fetchSocialAccounts, type SocialAccountPublic } from "@/lib/api/socialAccounts";
import { useSession } from "@/hooks/useSession";

export function useSocialAccounts() {
  const { user } = useSession();
  return useQuery<SocialAccountPublic[]>({
    queryKey: ["social-accounts", user?.id],
    queryFn: fetchSocialAccounts,
    enabled: !!user?.id,
    staleTime: 60_000,
  });
}
