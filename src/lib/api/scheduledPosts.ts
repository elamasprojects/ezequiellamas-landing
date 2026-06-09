import { supabase } from "@/lib/supabase";
import type { Tables, TablesInsert, TablesUpdate, Json } from "@/lib/database.types";
import type { PublishPlatform } from "@/lib/publishing/platformLimits";

export type ScheduledPost = Tables<"scheduled_posts">;
export type ScheduledPostInsert = TablesInsert<"scheduled_posts">;
export type ScheduledPostUpdate = TablesUpdate<"scheduled_posts">;
export type PublishJob = Tables<"publish_jobs">;

export type ScheduledPostStatus = ScheduledPost["status"];
export type ScheduledPostAssetKind = ScheduledPost["asset_kind"];

export const POST_STATUS_LABEL: Record<ScheduledPostStatus, string> = {
  draft: "Borrador",
  scheduled: "Programado",
  publishing: "Publicando",
  published: "Publicado",
  partial: "Parcial",
  failed: "Falló",
  cancelled: "Cancelado",
};

export interface ScheduledPostWithJobs extends ScheduledPost {
  publish_jobs: PublishJob[];
}

export interface ScheduledPostFilters {
  status?: ScheduledPostStatus;
  platform?: PublishPlatform;
  from?: string; // ISO date
  to?: string; // ISO date
  asset_kind?: ScheduledPostAssetKind;
}

export async function fetchScheduledPosts(
  filters: ScheduledPostFilters = {},
): Promise<ScheduledPostWithJobs[]> {
  let query = supabase
    .from("scheduled_posts")
    .select("*, publish_jobs(*)")
    .order("scheduled_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.asset_kind) query = query.eq("asset_kind", filters.asset_kind);
  if (filters.from) query = query.gte("scheduled_at", filters.from);
  if (filters.to) query = query.lte("scheduled_at", filters.to);

  const { data, error } = await query;
  if (error) throw error;
  let rows = (data ?? []) as unknown as ScheduledPostWithJobs[];

  if (filters.platform) {
    rows = rows.filter((p) => p.publish_jobs.some((j) => j.platform === filters.platform));
  }

  return rows;
}

export async function fetchScheduledPost(id: string): Promise<ScheduledPostWithJobs | null> {
  const { data, error } = await supabase
    .from("scheduled_posts")
    .select("*, publish_jobs(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as ScheduledPostWithJobs) ?? null;
}

export interface CreateScheduledPostInput {
  owner_id: string;
  asset_kind: ScheduledPostAssetKind;
  /** Bunny Stream video GUID (asset_kind = video, Bunny provider). */
  bunny_video_id?: string | null;
  /** Bunny Stream library id (asset_kind = video, Bunny provider). */
  bunny_library_id?: string | null;
  /** Supabase Storage path within the videos-final bucket (asset_kind = video, Supabase provider). */
  video_storage_path?: string | null;
  carousel_id?: string | null;
  title?: string | null;
  caption_default?: string | null;
  captions?: Record<string, string>;
  hashtags?: string[];
  scheduled_at: string;
  timezone?: string;
  script_id?: string | null;
  format_id?: string | null;
  thumbnail_url?: string | null;
  notes?: string | null;
  /** Platforms to publish to (creates one publish_job per platform). */
  platforms: PublishPlatform[];
  /** If true, schedules immediately; otherwise leaves as 'draft'. */
  schedule_now?: boolean;
  /** Pre-computed Whisper transcript so we don't re-pay if regenerating later. */
  transcript?: string | null;
  transcript_language?: string | null;
  transcript_status?: string | null;
}

export async function createScheduledPost(
  input: CreateScheduledPostInput,
): Promise<ScheduledPostWithJobs> {
  const { platforms, schedule_now, ...rest } = input;

  const { data: post, error: pErr } = await supabase
    .from("scheduled_posts")
    .insert({
      owner_id: rest.owner_id,
      asset_kind: rest.asset_kind,
      bunny_video_id: rest.bunny_video_id ?? null,
      bunny_library_id: rest.bunny_library_id ?? null,
      video_storage_path: rest.video_storage_path ?? null,
      carousel_id: rest.carousel_id ?? null,
      title: rest.title ?? null,
      caption_default: rest.caption_default ?? null,
      captions: (rest.captions ?? {}) as Json,
      hashtags: rest.hashtags ?? [],
      scheduled_at: rest.scheduled_at,
      timezone: rest.timezone ?? "America/Argentina/Buenos_Aires",
      script_id: rest.script_id ?? null,
      format_id: rest.format_id ?? null,
      thumbnail_url: rest.thumbnail_url ?? null,
      notes: rest.notes ?? null,
      status: schedule_now ? "scheduled" : "draft",
      transcript: rest.transcript ?? null,
      transcript_language: rest.transcript_language ?? null,
      transcript_status: rest.transcript_status ?? "idle",
    })
    .select()
    .single();

  if (pErr || !post) throw pErr ?? new Error("Insert into scheduled_posts failed");

  const { data: jobs, error: jErr } = await supabase
    .from("publish_jobs")
    .insert(
      platforms.map((p) => ({
        scheduled_post_id: post.id,
        platform: p,
        status: "pending" as const,
      })),
    )
    .select();

  if (jErr) {
    // Best-effort cleanup
    await supabase.from("scheduled_posts").delete().eq("id", post.id);
    throw jErr;
  }

  return { ...post, publish_jobs: jobs ?? [] };
}

export interface CreateBatchPostInput {
  owner_id: string;
  batch_id: string;
  bunny_video_id: string;
  bunny_library_id: string;
  scheduled_at: string; // assigned optimal slot (ISO)
  platforms: PublishPlatform[];
  format_id?: string | null;
  title?: string | null;
  thumbnail_url?: string | null;
}

/**
 * Creates one queued batch post: a draft scheduled_posts row with
 * prep_status='queued' (the process-batch-queue worker will caption it and flip
 * it to 'scheduled') plus its publish_jobs. Captions are intentionally left
 * empty — the worker fills them server-side.
 */
export async function createBatchPost(
  input: CreateBatchPostInput,
): Promise<ScheduledPostWithJobs> {
  const { data: post, error: pErr } = await supabase
    .from("scheduled_posts")
    .insert({
      owner_id: input.owner_id,
      asset_kind: "video",
      bunny_video_id: input.bunny_video_id,
      bunny_library_id: input.bunny_library_id,
      scheduled_at: input.scheduled_at,
      format_id: input.format_id ?? null,
      title: input.title ?? null,
      thumbnail_url: input.thumbnail_url ?? null,
      status: "draft",
      prep_status: "queued",
      batch_id: input.batch_id,
    })
    .select()
    .single();

  if (pErr || !post) throw pErr ?? new Error("Insert into scheduled_posts failed");

  const { data: jobs, error: jErr } = await supabase
    .from("publish_jobs")
    .insert(
      input.platforms.map((p) => ({
        scheduled_post_id: post.id,
        platform: p,
        status: "pending" as const,
      })),
    )
    .select();

  if (jErr) {
    await supabase.from("scheduled_posts").delete().eq("id", post.id);
    throw jErr;
  }

  return { ...post, publish_jobs: jobs ?? [] };
}

export async function updateScheduledPost(
  id: string,
  input: ScheduledPostUpdate,
): Promise<ScheduledPost> {
  const { data, error } = await supabase
    .from("scheduled_posts")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function cancelScheduledPost(id: string): Promise<void> {
  const { error } = await supabase
    .from("scheduled_posts")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteScheduledPost(id: string): Promise<void> {
  const { error } = await supabase.from("scheduled_posts").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Mark a publish job as manually published (used for TikTok Upload Mode where
 * the user finishes the post in the TikTok app, or for Manual provider).
 */
export async function markJobPublished(jobId: string, providerPostUrl?: string): Promise<void> {
  const { error } = await supabase
    .from("publish_jobs")
    .update({
      status: "succeeded",
      user_completed_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      provider_post_url: providerPostUrl ?? null,
    })
    .eq("id", jobId);
  if (error) throw error;
}
