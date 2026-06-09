import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";

export type PublishingSlot = Tables<"publishing_slots">;

export const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]; // index = JS getDay()

// Research-based general best-time blocks (weekday 0=Sun … 6=Sat), in the
// creator's local time. Seeded per owner and fully editable afterwards.
export const DEFAULT_SLOTS: { weekday: number; hour: number; minute: number }[] = [
  // Weekdays
  ...[1, 2, 3, 4, 5].flatMap((wd) => [
    { weekday: wd, hour: 8, minute: 0 },
    { weekday: wd, hour: 12, minute: 30 },
    { weekday: wd, hour: 19, minute: 0 },
  ]),
  // Weekend
  { weekday: 6, hour: 10, minute: 0 },
  { weekday: 6, hour: 20, minute: 0 },
  { weekday: 0, hour: 11, minute: 0 },
  { weekday: 0, hour: 19, minute: 0 },
];

export async function fetchPublishingSlots(): Promise<PublishingSlot[]> {
  const { data, error } = await supabase
    .from("publishing_slots")
    .select("*")
    .order("weekday", { ascending: true })
    .order("hour", { ascending: true })
    .order("minute", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createPublishingSlot(
  ownerId: string,
  input: { weekday: number; hour: number; minute: number },
): Promise<PublishingSlot> {
  const { data, error } = await supabase
    .from("publishing_slots")
    .insert({ ...input, owner_id: ownerId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePublishingSlot(id: string): Promise<void> {
  const { error } = await supabase.from("publishing_slots").delete().eq("id", id);
  if (error) throw error;
}

export async function seedDefaultPublishingSlots(ownerId: string): Promise<PublishingSlot[]> {
  const rows = DEFAULT_SLOTS.map((s) => ({ ...s, owner_id: ownerId }));
  const { data, error } = await supabase.from("publishing_slots").insert(rows).select();
  if (error) throw error;
  return data ?? [];
}

export interface SlotSuggestion {
  date: Date;
  occupied: boolean;
}

// Next optimal datetimes from the weekly slots, marking those already taken by an
// existing scheduled post (within ±toleranceMin). Computed in local time to match
// the schedule form's datetime-local input.
export function nextOptimalSlots(
  slots: { weekday: number; hour: number; minute: number; active?: boolean }[],
  occupied: Date[],
  opts: { count?: number; horizonDays?: number; toleranceMin?: number } = {},
): SlotSuggestion[] {
  const count = opts.count ?? 4;
  const horizonDays = opts.horizonDays ?? 14;
  const tol = (opts.toleranceMin ?? 30) * 60_000;
  const active = slots.filter((s) => s.active !== false);
  if (active.length === 0) return [];

  const now = Date.now();
  const minLead = now + 10 * 60_000; // at least 10 min out
  const candidates: Date[] = [];
  const base = new Date();
  for (let d = 0; d <= horizonDays; d++) {
    const day = new Date(base.getFullYear(), base.getMonth(), base.getDate() + d);
    for (const s of active) {
      if (day.getDay() !== s.weekday) continue;
      const c = new Date(day.getFullYear(), day.getMonth(), day.getDate(), s.hour, s.minute, 0, 0);
      if (c.getTime() > minLead) candidates.push(c);
    }
  }
  candidates.sort((a, b) => a.getTime() - b.getTime());

  return candidates.slice(0, count).map((date) => ({
    date,
    occupied: occupied.some((o) => Math.abs(o.getTime() - date.getTime()) < tol),
  }));
}
