import { supabase } from "@/lib/supabase";
import type { Tables, TablesInsert } from "@/lib/database.types";

export type Feedback = Tables<"advisor_feedback">;
export type FeedbackInsert = TablesInsert<"advisor_feedback">;
export type FeedbackScope = "video" | "script" | "format" | "general";

export interface FeedbackWithAuthor extends Feedback {
  advisor: { id: string; email: string; full_name: string | null } | null;
}

async function attachAuthors(rows: Feedback[]): Promise<FeedbackWithAuthor[]> {
  if (rows.length === 0) return [];
  const advisorIds = Array.from(new Set(rows.map((r) => r.advisor_id)));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .in("id", advisorIds);
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, advisor: byId.get(r.advisor_id) ?? null }));
}

export async function fetchFeedbackForVideo(videoId: string): Promise<FeedbackWithAuthor[]> {
  const { data, error } = await supabase
    .from("advisor_feedback")
    .select("*")
    .eq("video_id", videoId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return attachAuthors(data ?? []);
}

export async function fetchAllFeedbackForAdmin(): Promise<FeedbackWithAuthor[]> {
  // Admin sees all feedback addressed to them; advisor sees only what they wrote
  const { data, error } = await supabase
    .from("advisor_feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return attachAuthors(data ?? []);
}

export async function createFeedback(input: {
  admin_id: string;
  advisor_id: string;
  body: string;
  video_id?: string | null;
  script_id?: string | null;
  format_id?: string | null;
  scope: FeedbackScope;
  parent_id?: string | null;
}): Promise<Feedback> {
  const { data, error } = await supabase
    .from("advisor_feedback")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteFeedback(id: string): Promise<void> {
  const { error } = await supabase.from("advisor_feedback").delete().eq("id", id);
  if (error) throw error;
}
