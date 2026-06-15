import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface WaitlistPayload {
  email: string;
  name?: string;
  platforms?: string[];
  /** Honeypot — must stay empty for real humans. */
  website?: string;
}

export interface WaitlistResult {
  ok: boolean;
  already?: boolean;
  emailed?: boolean;
}

/** Pull the server's error message out of a FunctionsHttpError response body. */
async function extractError(error: unknown): Promise<string> {
  const ctx = (error as { context?: unknown })?.context;
  if (ctx instanceof Response) {
    try {
      const body = await ctx.clone().json();
      if (body?.error) return String(body.error);
    } catch {
      /* not JSON — fall through */
    }
  }
  return error instanceof Error ? error.message : "No pudimos sumarte a la lista. Probá de nuevo.";
}

/**
 * Posts to the public `join-waitlist` edge function, which stores the signup
 * and sends a branded welcome email. Idempotent per email (returns `already`).
 */
export function useJoinWaitlist() {
  return useMutation<WaitlistResult, Error, WaitlistPayload>({
    mutationFn: async (payload) => {
      const { data, error } = await supabase.functions.invoke("join-waitlist", {
        body: payload,
      });

      if (error) {
        throw new Error(await extractError(error));
      }
      if (data && (data as { error?: string }).error) {
        throw new Error((data as { error: string }).error);
      }
      return data as WaitlistResult;
    },
  });
}
