import { useQuery } from "@tanstack/react-query";
import { fetchResourceBySlug } from "@/lib/api/resources";

export function useResourceBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["resource_by_slug", slug],
    queryFn: () => fetchResourceBySlug(slug!),
    enabled: !!slug,
    staleTime: 60_000,
  });
}
