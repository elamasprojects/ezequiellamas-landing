import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";

export type Notification = Tables<"notifications">;

export interface SendNotificationInput {
  user_id: string;
  kind:
    | "assignment_created"
    | "submission_uploaded"
    | "correction_requested"
    | "submission_approved"
    | string;
  title: string;
  body?: string;
  link?: string;
  dedupe_key?: string;
  send_email?: boolean;
  meta?: Record<string, string | number | null>;
}

export async function fetchNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function markAllRead(): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) throw error;
}

export async function sendNotification(input: SendNotificationInput): Promise<{ ok: boolean; notification_id?: string | null; error?: string }> {
  const { data, error } = await supabase.functions.invoke<{ ok: boolean; notification_id?: string; error?: string }>(
    "send-notification",
    { body: input },
  );
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "empty response" };
  if ("error" in data && data.error) return { ok: false, error: data.error };
  return { ok: true, notification_id: data.notification_id };
}
