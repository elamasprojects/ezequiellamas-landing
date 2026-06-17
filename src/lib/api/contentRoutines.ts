import { supabase } from "@/lib/supabase";

export type RoutineSystem = "knowledge" | "news" | "winners";

export const ROUTINE_LABELS: Record<RoutineSystem, string> = {
  knowledge: "Desde mi conocimiento",
  news: "Desde noticias de IA",
  winners: "Reciclar ganadores",
};

// Systems exposed as on-demand buttons. `news` runs ONLY on its claude.ai schedule
// (it reads the daily AI-news digests), so it has no manual trigger.
export const MANUAL_ROUTINES: RoutineSystem[] = ["knowledge", "winners"];

// Fire-and-forget: a 200 only acks that the cloud routine started. The generated
// ideas land in the bandeja a few minutes later (via ingest-content-idea), and
// Realtime refreshes the queue.
export async function triggerContentRoutine(system: RoutineSystem): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
    "trigger-content-routine",
    { body: { system } },
  );
  if (error) {
    // Supabase hides the JSON body on non-2xx; recover it from error.context.
    const ctx = (error as { context?: Response })?.context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const b = (await ctx.clone().json()) as { error?: string } | null;
        if (b?.error) throw new Error(b.error);
      } catch {
        /* fall through */
      }
    }
    throw new Error((error as { message?: string })?.message ?? "No se pudo disparar la rutina");
  }
  if (data && "error" in data && data.error) throw new Error(data.error);
}
