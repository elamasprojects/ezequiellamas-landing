import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * Subscribes to carousel_slides + carousel_render_jobs UPDATE events scoped
 * to the given carousel id. On every event, invalidates the carousel query
 * so the UI re-fetches the new state.
 *
 * The supabase_realtime publication includes both tables (m9_carousels migration).
 */
export function useCarouselRealtime(carouselId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!carouselId) return;
    const channel = supabase
      .channel(`carousel:${carouselId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "carousel_slides",
          filter: `carousel_id=eq.${carouselId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["carousel", carouselId] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "carousel_render_jobs",
          filter: `carousel_id=eq.${carouselId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["carousel", carouselId] });
          qc.invalidateQueries({ queryKey: ["carousels"] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [carouselId, qc]);
}
