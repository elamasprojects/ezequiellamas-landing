import { useQuery } from "@tanstack/react-query";
import { fetchScripts, type ScriptStatus } from "@/lib/api/scripts";

export function useScripts(opts?: { status?: ScriptStatus }) {
  return useQuery({
    queryKey: ["scripts", { status: opts?.status ?? null }],
    queryFn: () => fetchScripts(opts),
    staleTime: 30_000,
  });
}
