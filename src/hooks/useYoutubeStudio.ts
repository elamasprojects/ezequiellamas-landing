import { useQuery } from "@tanstack/react-query";
import {
  fetchProjectSections,
  fetchProjectThumbnails,
  fetchYoutubeProject,
  fetchYoutubeProjects,
} from "@/lib/api/youtubeStudio";

export function useYoutubeProjects() {
  return useQuery({ queryKey: ["youtube-projects"], queryFn: fetchYoutubeProjects, staleTime: 30_000 });
}

export function useYoutubeProject(id: string | undefined) {
  return useQuery({
    queryKey: ["youtube-project", id],
    queryFn: () => fetchYoutubeProject(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useProjectSections(projectId: string | undefined) {
  return useQuery({
    queryKey: ["youtube-project-sections", projectId],
    queryFn: () => fetchProjectSections(projectId!),
    enabled: !!projectId,
    staleTime: 15_000,
  });
}

export function useProjectThumbnails(projectId: string | undefined) {
  return useQuery({
    queryKey: ["youtube-project-thumbnails", projectId],
    queryFn: () => fetchProjectThumbnails(projectId!),
    enabled: !!projectId,
    staleTime: 15_000,
  });
}
