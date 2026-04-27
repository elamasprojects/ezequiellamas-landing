import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { PublishPlatform } from "@/lib/publishing/platformLimits";

async function unwrapError(error: unknown): Promise<never> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as { error?: string };
      if (body?.error) throw new Error(body.error);
    } catch (jsonErr) {
      if (jsonErr instanceof Error && jsonErr.message) throw jsonErr;
    }
  }
  throw new Error(error instanceof Error ? error.message : String(error));
}

// ──────────────────────────────────────────────────────────────────────────
// OAuth flows
// ──────────────────────────────────────────────────────────────────────────

export interface StartOAuthInput {
  platform: PublishPlatform;
  redirect_path?: string; // path inside the app to come back to after callback
}

export interface StartOAuthResult {
  url: string;
  state: string;
}

export async function startOAuth(input: StartOAuthInput): Promise<StartOAuthResult> {
  const { data, error } = await supabase.functions.invoke<StartOAuthResult | { error: string }>(
    "oauth-start",
    { body: input },
  );
  if (error) await unwrapError(error);
  if (!data) throw new Error("Empty response from oauth-start");
  if ("error" in data) throw new Error(data.error);
  return data as StartOAuthResult;
}

export interface OAuthCallbackInput {
  platform: PublishPlatform;
  code: string;
  state: string;
}

export interface OAuthCallbackResult {
  ok: true;
  account_id: string;
  display_name: string | null;
}

export async function completeOAuth(
  input: OAuthCallbackInput,
): Promise<OAuthCallbackResult> {
  const { data, error } = await supabase.functions.invoke<OAuthCallbackResult | { error: string }>(
    "oauth-callback",
    { body: input },
  );
  if (error) await unwrapError(error);
  if (!data) throw new Error("Empty response from oauth-callback");
  if ("error" in data) throw new Error(data.error);
  return data;
}

// ──────────────────────────────────────────────────────────────────────────
// Publish
// ──────────────────────────────────────────────────────────────────────────

export interface PublishNowInput {
  scheduled_post_id: string;
  platform?: PublishPlatform; // if omitted, publishes to all jobs of the post
}

export interface PublishNowJobResult {
  job_id: string;
  platform: PublishPlatform;
  status: "succeeded" | "failed" | "awaiting_user";
  provider_post_url?: string;
  error?: string;
}

export interface PublishNowResult {
  ok: boolean;
  results: PublishNowJobResult[];
}

export async function publishNow(input: PublishNowInput): Promise<PublishNowResult> {
  const { data, error } = await supabase.functions.invoke<PublishNowResult | { error: string }>(
    "publish-now",
    { body: input },
  );
  if (error) await unwrapError(error);
  if (!data) throw new Error("Empty response from publish-now");
  if ("error" in data && !("ok" in data)) throw new Error((data as { error: string }).error);
  return data as PublishNowResult;
}
