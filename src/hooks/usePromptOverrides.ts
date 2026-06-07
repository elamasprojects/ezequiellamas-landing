import { useQuery } from "@tanstack/react-query";
import { fetchPromptDefaults, fetchPromptOverrides } from "@/lib/api/promptOverrides";

export function usePromptOverrides() {
  return useQuery({
    queryKey: ["prompt_overrides"],
    queryFn: fetchPromptOverrides,
    staleTime: 60_000,
  });
}

// Defaults rarely change (they ship with the edge functions), so cache them
// for the whole session.
export function usePromptDefaults() {
  return useQuery({
    queryKey: ["prompt_defaults"],
    queryFn: fetchPromptDefaults,
    staleTime: Infinity,
  });
}
