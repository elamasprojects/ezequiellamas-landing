import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";
import { createScheduledPost, type CreateScheduledPostInput } from "@/lib/api/scheduledPosts";
import { publishNow } from "@/lib/api/publishing";
import { fetchPublishingSlots, nextOptimalSlots } from "@/lib/api/publishingSlots";

export type ReelProposal = Tables<"reel_proposals">;
export type ReelProposalStatus = ReelProposal["status"];

export interface ProposalMetrics {
  by_platform?: Record<string, { views: number; likes: number; comments: number; shares: number; saves: number }>;
  total_views?: number;
  total_engagement?: number;
  engagement_rate?: number;
}

export async function fetchReelProposals(status?: ReelProposalStatus): Promise<ReelProposal[]> {
  let q = supabase
    .from("reel_proposals")
    .select("*")
    .order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

// Next free optimal slot that doesn't already have an Instagram post on it.
async function nextInstagramSlot(): Promise<Date> {
  const slots = await fetchPublishingSlots();
  if (!slots || slots.length === 0) {
    throw new Error("Configurá tus horarios óptimos antes de programar.");
  }
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from("scheduled_posts")
    .select("scheduled_at, status, publish_jobs!inner(platform)")
    .gte("scheduled_at", nowIso)
    .in("status", ["draft", "scheduled", "publishing"])
    .eq("publish_jobs.platform", "instagram");
  const occupied = (data ?? []).map((r) => new Date(r.scheduled_at as string));
  const suggestions = nextOptimalSlots(slots, occupied, { count: 1 });
  if (suggestions.length === 0) {
    throw new Error("No encontré un slot libre próximo. Agregá más horarios.");
  }
  return suggestions[0].date;
}

function buildInput(p: ReelProposal, ownerId: string, scheduledAtIso: string): CreateScheduledPostInput {
  // Clips are always uploaded to Bunny, so this should always hold; guard anyway
  // to surface a clear error instead of a CHECK-constraint 500.
  if (!p.bunny_video_id) {
    throw new Error("La propuesta no tiene el video de Bunny asociado; no se puede programar.");
  }
  return {
    owner_id: ownerId,
    asset_kind: "video",
    bunny_video_id: p.bunny_video_id,
    bunny_library_id: p.bunny_library_id,
    title: p.title,
    caption_default: p.caption_snapshot,
    captions: {},
    hashtags: p.hashtags ?? [],
    scheduled_at: scheduledAtIso,
    thumbnail_url: p.thumbnail_url,
    platforms: ["instagram"],
    schedule_now: true,
  };
}

// Approve → schedule to the next free Instagram slot. Returns the chosen date.
export async function approveProposalSchedule(p: ReelProposal, ownerId: string): Promise<Date> {
  const slot = await nextInstagramSlot();
  const post = await createScheduledPost(buildInput(p, ownerId, slot.toISOString()));
  const { error } = await supabase
    .from("reel_proposals")
    .update({ status: "approved_scheduled", instagram_scheduled_post_id: post.id })
    .eq("id", p.id);
  if (error) throw error;
  return slot;
}

// Approve → publish to Instagram now.
export async function approveProposalPublishNow(p: ReelProposal, ownerId: string): Promise<void> {
  const post = await createScheduledPost(buildInput(p, ownerId, new Date().toISOString()));
  await publishNow({ scheduled_post_id: post.id });
  const { error } = await supabase
    .from("reel_proposals")
    .update({ status: "approved_published", instagram_scheduled_post_id: post.id })
    .eq("id", p.id);
  if (error) throw error;
}

export async function rejectProposal(id: string): Promise<void> {
  const { error } = await supabase.from("reel_proposals").update({ status: "rejected" }).eq("id", id);
  if (error) throw error;
}
