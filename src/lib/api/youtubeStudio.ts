import { supabase } from "@/lib/supabase";
import type { Tables, TablesUpdate } from "@/lib/database.types";
import { generateCover } from "@/lib/api/covers";

export type YoutubeProject = Tables<"youtube_projects">;
export type YoutubeProjectSection = Tables<"youtube_project_sections">;
export type YoutubeProjectSectionUpdate = TablesUpdate<"youtube_project_sections">;
export type LengthTier = "short" | "medium" | "long";

export async function fetchYoutubeProjects(): Promise<YoutubeProject[]> {
  const { data, error } = await supabase
    .from("youtube_projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchYoutubeProject(id: string): Promise<YoutubeProject | null> {
  const { data, error } = await supabase.from("youtube_projects").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchProjectSections(projectId: string): Promise<YoutubeProjectSection[]> {
  const { data, error } = await supabase
    .from("youtube_project_sections")
    .select("*")
    .eq("project_id", projectId)
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export interface GenerateStructureInput {
  youtube_project_id?: string;
  idea?: string;
  audio_upload_id?: string;
  length_tier: LengthTier;
}

export async function generateStructure(input: GenerateStructureInput): Promise<{ project_id: string; sections: number }> {
  const { data, error } = await supabase.functions.invoke<{ project_id: string; sections: number } | { error: string }>(
    "generate-youtube-structure",
    { body: input },
  );
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const b = (await ctx.clone().json()) as { error?: string };
        if (b?.error) throw new Error(b.error);
      } catch { /* fall through */ }
    }
    throw new Error(error.message);
  }
  if (!data || "error" in data) throw new Error((data as { error: string })?.error ?? "Empty response");
  return data;
}

export async function updateYoutubeProject(id: string, patch: TablesUpdate<"youtube_projects">): Promise<void> {
  const { error } = await supabase.from("youtube_projects").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteYoutubeProject(id: string): Promise<void> {
  const { error } = await supabase.from("youtube_projects").delete().eq("id", id);
  if (error) throw error;
}

export async function updateSection(id: string, patch: YoutubeProjectSectionUpdate): Promise<void> {
  const { error } = await supabase.from("youtube_project_sections").update(patch).eq("id", id);
  if (error) throw error;
}

// Clone: HeyGen avatar + (avatar voice | recorded | ElevenLabs) audio.
export async function generateClone(sectionId: string): Promise<{ ok: boolean; heygen_video_id?: string }> {
  const { data, error } = await supabase.functions.invoke<{ ok: boolean; heygen_video_id?: string } | { error: string }>(
    "start-heygen-render",
    { body: { section_id: sectionId } },
  );
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const b = (await ctx.clone().json()) as { error?: string };
        if (b?.error) throw new Error(b.error);
      } catch { /* fall through */ }
    }
    throw new Error(error.message);
  }
  if (!data || "error" in data) throw new Error((data as { error: string })?.error ?? "Empty response");
  return data;
}

// Thumbnails: reuse the Gemini covers flow (3 options, 16:9, linked to the project).
export interface ProjectThumbnail {
  id: string;
  status: string;
  generated_image_path: string | null;
  generation_error: string | null;
}

export async function fetchProjectThumbnails(projectId: string): Promise<ProjectThumbnail[]> {
  const { data, error } = await supabase
    .from("covers")
    .select("id, status, generated_image_path, generation_error")
    .eq("youtube_project_id", projectId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function generateProjectThumbnails(
  projectId: string,
  ownerId: string,
  title: string,
): Promise<void> {
  // Create 3 cover rows linked to the project, then trigger Gemini on each.
  const rows = [0, 1, 2].map(() => ({
    owner_id: ownerId,
    title,
    aspect_ratio: "16:9",
    status: "idle",
    youtube_project_id: projectId,
  }));
  const { data: created, error } = await supabase.from("covers").insert(rows).select("id");
  if (error) throw error;
  await Promise.allSettled((created ?? []).map((c) => generateCover(c.id)));
}
