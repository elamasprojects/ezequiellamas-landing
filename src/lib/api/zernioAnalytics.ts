import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";

export type ZernioAccountStats = Tables<"zernio_account_stats">;
export type ZernioAccountDaily = Tables<"zernio_account_daily">;
export type ZernioPostAnalytics = Tables<"zernio_post_analytics">;

export type ZernioPlatform = "instagram" | "tiktok" | "youtube";

export const PLATFORM_LABEL: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};

export async function fetchAccountStats(): Promise<ZernioAccountStats[]> {
  const { data, error } = await supabase
    .from("zernio_account_stats")
    .select("*")
    .order("followers", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchFollowerSeries(days = 90): Promise<ZernioAccountDaily[]> {
  const from = new Date();
  from.setDate(from.getDate() - days);
  const { data, error } = await supabase
    .from("zernio_account_daily")
    .select("*")
    .gte("date", from.toISOString().slice(0, 10))
    .order("date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchRecentPostAnalytics(limit = 12): Promise<ZernioPostAnalytics[]> {
  const { data, error } = await supabase
    .from("zernio_post_analytics")
    .select("*")
    .order("posted_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export interface ZernioSyncResult {
  ok: boolean;
  followers?: number;
  daily?: number;
  posts?: number;
  errors?: string[];
}

// Manual refresh — invokes the same edge function the cron runs.
export async function triggerZernioAnalyticsSync(): Promise<ZernioSyncResult> {
  const { data, error } = await supabase.functions.invoke<ZernioSyncResult>(
    "zernio-analytics-sync",
    { body: {} },
  );
  if (error) throw error;
  return data ?? { ok: false };
}

// ── Derived helpers for the dashboard ───────────────────────────────────────

/** Pivots the daily rows into recharts-friendly `[{ date, instagram, tiktok, youtube }]`. */
export function pivotFollowerSeries(
  rows: ZernioAccountDaily[],
): Array<Record<string, number | string>> {
  const byDate = new Map<string, Record<string, number | string>>();
  for (const r of rows) {
    const key = r.date;
    if (!byDate.has(key)) byDate.set(key, { date: key });
    const entry = byDate.get(key)!;
    if (r.followers != null) entry[r.platform] = r.followers;
  }
  return Array.from(byDate.values()).sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  );
}

export function totalFollowers(stats: ZernioAccountStats[]): number {
  return stats.reduce((sum, s) => sum + (s.followers ?? 0), 0);
}
