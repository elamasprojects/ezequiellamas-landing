import { supabase } from "@/lib/supabase";
import type { Tables, TablesInsert } from "@/lib/database.types";

export type Submission = Tables<"video_submissions">;
export type SubmissionInsert = TablesInsert<"video_submissions">;
export type Correction = Tables<"corrections">;

export interface SubmissionWithCorrections extends Submission {
  corrections: Correction[];
}

export async function fetchSubmissions(assignmentId: string): Promise<SubmissionWithCorrections[]> {
  const { data, error } = await supabase
    .from("video_submissions")
    .select("*, corrections(*)")
    .eq("assignment_id", assignmentId)
    .order("version", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as SubmissionWithCorrections[];
}

export async function createSubmission(input: {
  assignment_id: string;
  editor_id: string;
  drive_url: string;
  notes?: string | null;
}): Promise<Submission> {
  // Determine next version
  const { data: existing } = await supabase
    .from("video_submissions")
    .select("version")
    .eq("assignment_id", input.assignment_id)
    .order("version", { ascending: false })
    .limit(1);
  const nextVersion = existing && existing.length ? (existing[0].version ?? 0) + 1 : 1;

  const insert: SubmissionInsert = {
    assignment_id: input.assignment_id,
    editor_id: input.editor_id,
    drive_url: input.drive_url,
    notes: input.notes ?? null,
    version: nextVersion,
    status: "pending_review",
  };
  const { data, error } = await supabase.from("video_submissions").insert(insert).select().single();
  if (error) throw error;
  return data;
}

export async function setSubmissionStatus(
  id: string,
  status: "pending_review" | "needs_correction" | "approved",
): Promise<Submission> {
  const { data, error } = await supabase
    .from("video_submissions")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createCorrection(submissionId: string, requestedBy: string, notes: string): Promise<Correction> {
  const { data, error } = await supabase
    .from("corrections")
    .insert({ submission_id: submissionId, requested_by: requestedBy, notes })
    .select()
    .single();
  if (error) throw error;
  return data;
}
