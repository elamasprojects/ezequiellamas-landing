// React Query hooks for the Animations system.
// Sibling of useBrolls.ts — same realtime + invalidation patterns.

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAnimationsForScript,
  fetchMotionGraphicCategories,
  fetchMotionGraphicTemplates,
  fetchQueuedAnimations,
} from "@/lib/api/animations";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

/**
 * Realtime subscription for `motion_graphic_suggestions`. Invalidates:
 *   - ["animations", "queue"]    — the Animations queue page
 *   - ["animations", "by-script"] (all scripts) — ScriptEditor's AnimationManager
 *
 * Mounted by both `useQueuedAnimations` and `useAnimationsByScript`. The
 * `removeChannel` cleanup deduplicates the underlying socket.
 */
export function useAnimationRealtime() {
  const { user } = useSession();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("motion-graphic-suggestions-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "motion_graphic_suggestions" },
        () => {
          qc.invalidateQueries({ queryKey: ["animations"] });
          qc.invalidateQueries({ queryKey: ["script"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);
}

export function useQueuedAnimations() {
  useAnimationRealtime();
  return useQuery({
    queryKey: ["animations", "queue"],
    queryFn: fetchQueuedAnimations,
  });
}

export function useAnimationsByScript(scriptId: string | null | undefined) {
  useAnimationRealtime();
  return useQuery({
    queryKey: ["animations", "by-script", scriptId],
    queryFn: () => fetchAnimationsForScript(scriptId as string),
    enabled: !!scriptId,
  });
}

export function useMotionGraphicCategories() {
  return useQuery({
    queryKey: ["motion-graphic-categories"],
    queryFn: fetchMotionGraphicCategories,
  });
}

export function useMotionGraphicTemplates() {
  return useQuery({
    queryKey: ["motion-graphic-templates"],
    queryFn: fetchMotionGraphicTemplates,
  });
}
