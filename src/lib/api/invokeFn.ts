import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface FnResult<T> {
  ok: boolean;
  data: T | null;
  /** Human-readable error message (parsed from the function's JSON body when possible). */
  error?: string;
  /** The function's structured JSON body on a non-2xx response (e.g. `{ error, requiresAddon }`). */
  body?: Record<string, unknown>;
}

/**
 * Wrapper around `supabase.functions.invoke` that actually surfaces the edge
 * function's JSON error body. `invoke` throws `FunctionsHttpError` for any
 * non-2xx status and leaves `data` null, so the structured `{ error, ... }` body
 * is only reachable via `error.context.json()`. Callers were getting the generic
 * "Edge Function returned a non-2xx status code" string instead.
 */
export async function invokeFn<T = unknown>(name: string, body?: unknown): Promise<FnResult<T>> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body: body ?? {} });
  if (!error) return { ok: true, data: data ?? null };
  if (error instanceof FunctionsHttpError) {
    const parsed = (await error.context.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: false, data: null, error: (parsed.error as string) ?? error.message, body: parsed };
  }
  return { ok: false, data: null, error: error.message };
}
