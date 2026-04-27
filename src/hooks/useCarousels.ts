import { useQuery } from "@tanstack/react-query";
import {
  fetchCarousels,
  fetchCarouselWithSlides,
  type CarouselWithSlides,
} from "@/lib/api/carousels";

export function useCarousels() {
  return useQuery({
    queryKey: ["carousels"],
    queryFn: fetchCarousels,
    staleTime: 30_000,
  });
}

export function useCarousel(id: string | undefined) {
  return useQuery<CarouselWithSlides | null>({
    queryKey: ["carousel", id],
    queryFn: () => fetchCarouselWithSlides(id!),
    enabled: !!id,
    staleTime: 10_000,
  });
}
