import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface DashboardKpis {
  ideasDraft: number;
  assignmentsOpen: number;
  paymentsPending: number;
  videosThisMonth: number;
}

/**
 * Aggregate counts for the admin dashboard KPI strip.
 * Uses HEAD count queries — no rows transferred, just the totals.
 */
export function useDashboardKpis() {
  return useQuery<DashboardKpis>({
    queryKey: ["dashboard-kpis"],
    queryFn: async () => {
      const monthStartISO = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1,
      ).toISOString();

      const [draftRes, openRes, payRes, videoRes] = await Promise.all([
        supabase
          .from("scripts")
          .select("*", { count: "exact", head: true })
          .eq("status", "draft"),
        supabase
          .from("editor_assignments")
          .select("*", { count: "exact", head: true })
          .not("status", "in", "(approved,archived)"),
        supabase
          .from("editor_assignments")
          .select("*", { count: "exact", head: true })
          .eq("status", "approved")
          .neq("payment_status", "paid"),
        supabase
          .from("videos")
          .select("*", { count: "exact", head: true })
          .gte("created_at", monthStartISO),
      ]);

      const errs = [draftRes.error, openRes.error, payRes.error, videoRes.error].filter(
        Boolean,
      );
      if (errs.length) throw errs[0]!;

      return {
        ideasDraft: draftRes.count ?? 0,
        assignmentsOpen: openRes.count ?? 0,
        paymentsPending: payRes.count ?? 0,
        videosThisMonth: videoRes.count ?? 0,
      };
    },
    staleTime: 30_000,
  });
}
