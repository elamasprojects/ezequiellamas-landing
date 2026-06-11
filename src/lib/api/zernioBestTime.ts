import { supabase } from "@/lib/supabase";

// Zernio best-time slot (from GET /v1/analytics/best-time).
export interface ZernioBestSlot {
  day_of_week: number; // 0 = Monday … 6 = Sunday
  hour: number; // 0–23, UTC
  avg_engagement: number; // likes+comments+shares+saves
  post_count: number;
}

export interface ZernioBestTimeResult {
  ok: boolean;
  slots?: ZernioBestSlot[];
  error?: string;
  requiresAddon?: boolean;
}

export async function fetchZernioBestTime(platform?: string): Promise<ZernioBestTimeResult> {
  const { data, error } = await supabase.functions.invoke<ZernioBestTimeResult>("zernio-best-time", {
    body: platform ? { platform } : {},
  });
  if (error) {
    // Surface the function's structured error (e.g. requiresAddon) when possible.
    return { ok: false, error: error.message };
  }
  return data ?? { ok: false };
}

// 2024-01-01 00:00 UTC is a Monday — our reference for converting Zernio's
// (day_of_week=0..6 Mon..Sun, hour UTC) into the local (JS getDay 0..6 Sun..Sat,
// local hour) shape that publishing_slots uses. Building a real Date handles the
// timezone offset (incl. day rollover) correctly.
const REF_MONDAY_UTC = Date.UTC(2024, 0, 1, 0, 0, 0);

export interface LocalSlot {
  weekday: number; // JS getDay: 0 = Sunday
  hour: number; // local
  minute: number;
}

export function zernioSlotToLocal(slot: ZernioBestSlot): LocalSlot {
  const d = new Date(REF_MONDAY_UTC + slot.day_of_week * 86_400_000 + slot.hour * 3_600_000);
  return { weekday: d.getDay(), hour: d.getHours(), minute: 0 };
}

// Pick the top N best slots (by avg_engagement), filtering low-confidence ones,
// converted to local time and de-duplicated by (weekday, hour).
export function topLocalSlots(
  slots: ZernioBestSlot[],
  opts: { count?: number; minPosts?: number } = {},
): LocalSlot[] {
  const count = opts.count ?? 10;
  const minPosts = opts.minPosts ?? 2;
  const ranked = [...slots]
    .filter((s) => (s.post_count ?? 0) >= minPosts)
    .sort((a, b) => (b.avg_engagement ?? 0) - (a.avg_engagement ?? 0));
  const out: LocalSlot[] = [];
  const seen = new Set<string>();
  for (const s of ranked) {
    if (out.length >= count) break;
    const local = zernioSlotToLocal(s);
    const key = `${local.weekday}:${local.hour}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(local);
  }
  return out;
}
