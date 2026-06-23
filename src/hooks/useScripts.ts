import { useQuery } from "@tanstack/react-query";
import { fetchScripts, type ScriptStatus, type ScriptContentLength } from "@/lib/api/scripts";

export function useScripts(opts?: {
  status?: ScriptStatus;
  statuses?: ScriptStatus[];
  contentLength?: ScriptContentLength;
}) {
  return useQuery({
    queryKey: [
      "scripts",
      {
        status: opts?.status ?? null,
        statuses: opts?.statuses ?? null,
        contentLength: opts?.contentLength ?? null,
      },
    ],
    queryFn: () => fetchScripts(opts),
    staleTime: 30_000,
  });
}
