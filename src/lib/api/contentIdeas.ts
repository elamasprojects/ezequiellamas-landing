import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";
import { generateScript } from "@/lib/api/generation";

export type ContentIdea = Tables<"content_ideas">;
export type ContentIdeaStatus = ContentIdea["status"];
export type ContentIdeaSource = ContentIdea["source"];

// Editable fields exposed in the swipe card.
export interface ContentIdeaPatch {
  concept?: string | null;
  hook?: string | null;
  angle?: string | null;
  pillar?: string | null;
  suggested_format_id?: string | null;
}

export async function fetchContentIdeas(status?: ContentIdeaStatus): Promise<ContentIdea[]> {
  let q = supabase
    .from("content_ideas")
    .select("*")
    // Oldest pending first: the queue is FIFO so the user works the backlog in order.
    .order("created_at", { ascending: true });
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function updateIdea(id: string, patch: ContentIdeaPatch): Promise<void> {
  const { error } = await supabase.from("content_ideas").update(patch).eq("id", id);
  if (error) throw error;
}

// Compose the brief handed to generate-script. The idea's concept is the core;
// angle/hook are layered as extra guidance so the generated guion keeps the
// chosen framing.
function composeConcept(idea: ContentIdea): string {
  const parts: string[] = [];
  if (idea.concept) parts.push(idea.concept.trim());
  if (idea.angle) parts.push(`Ángulo: ${idea.angle.trim()}`);
  if (idea.hook) parts.push(`Hook propuesto: ${idea.hook.trim()}`);
  return parts.join("\n\n");
}

// Approve → generate the full script, then stamp the idea. Script create happens
// FIRST so a failure leaves the idea pending (same ordering as approveProposalSchedule).
// The partial-unique index on generated_script_id is the server-side backstop
// against a double-swipe creating two scripts from one idea.
export async function approveIdea(idea: ContentIdea): Promise<string> {
  const { script_id } = await generateScript({
    raw_concept: composeConcept(idea) || undefined,
    format_id: idea.suggested_format_id ?? undefined,
    referent_video_id: idea.referent_video_id ?? undefined,
    idea_reference_id: idea.idea_reference_id ?? undefined,
  });
  const { error } = await supabase
    .from("content_ideas")
    .update({ status: "approved", generated_script_id: script_id })
    .eq("id", idea.id);
  if (error) throw error;
  return script_id;
}

export async function rejectIdea(id: string): Promise<void> {
  const { error } = await supabase.from("content_ideas").update({ status: "rejected" }).eq("id", id);
  if (error) throw error;
}
