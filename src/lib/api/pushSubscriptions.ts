import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

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

export interface RegisterPushInput {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string;
  device_label?: string;
}

export async function registerPushSubscription(input: RegisterPushInput): Promise<{ ok: true }> {
  const { data, error } = await supabase.functions.invoke<{ ok: true } | { error: string }>(
    "register-push-subscription",
    { body: input },
  );
  if (error) await unwrapError(error);
  if (!data) throw new Error("Empty response from register-push-subscription");
  if ("error" in data) throw new Error(data.error);
  return data;
}

export async function unregisterPushSubscription(endpoint: string): Promise<void> {
  const { error } = await supabase
    .from("web_push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);
  if (error) throw error;
}

/**
 * Convert a Base64 URL-safe string to Uint8Array (needed for PushManager subscribe).
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

/**
 * Convert an ArrayBuffer to URL-safe Base64 string.
 */
function arrayBufferToBase64Url(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function pushSubscriptionToInsert(sub: PushSubscription): RegisterPushInput {
  const json = sub.toJSON();
  return {
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh ?? arrayBufferToBase64Url(sub.getKey("p256dh")),
    auth: json.keys?.auth ?? arrayBufferToBase64Url(sub.getKey("auth")),
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  };
}
