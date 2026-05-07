// Single Supabase service-role admin client, lazily initialized.
// Both upload.ts (storage uploads) and queue.ts (broll status updates) use it.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function admin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("missing_supabase_env_vars");
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}
