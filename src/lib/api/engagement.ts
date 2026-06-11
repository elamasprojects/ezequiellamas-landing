import { supabase } from "@/lib/supabase";
import { invokeFn } from "@/lib/api/invokeFn";
import type { Tables, TablesInsert } from "@/lib/database.types";

export type EngagementSettings = Tables<"engagement_settings">;
export type EngagementReply = Tables<"engagement_replies">;
export type EngagementReplyStatus = EngagementReply["status"];

export async function fetchEngagementSettings(): Promise<EngagementSettings | null> {
  const { data, error } = await supabase.from("engagement_settings").select("*").maybeSingle();
  if (error) throw error;
  return data;
}

export type EngagementSettingsPatch = Partial<
  Pick<EngagementSettings, "enabled" | "comments_enabled" | "dms_enabled" | "tone_instructions">
>;

export async function upsertEngagementSettings(
  ownerId: string,
  patch: EngagementSettingsPatch,
): Promise<EngagementSettings> {
  const { data, error } = await supabase
    .from("engagement_settings")
    .upsert({ owner_id: ownerId, ...patch } as TablesInsert<"engagement_settings">, {
      onConflict: "owner_id",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchEngagementReplies(
  status?: EngagementReplyStatus,
): Promise<EngagementReply[]> {
  let q = supabase.from("engagement_replies").select("*").order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function rejectEngagementReply(id: string): Promise<void> {
  const { error } = await supabase.from("engagement_replies").update({ status: "rejected" }).eq("id", id);
  if (error) throw error;
}

export interface SendReplyResult {
  ok: boolean;
  error?: string;
}

export async function sendEngagementReply(replyId: string, text?: string): Promise<SendReplyResult> {
  const res = await invokeFn<SendReplyResult>("send-engagement-reply", { reply_id: replyId, text });
  if (!res.ok) throw new Error(res.error ?? "No se pudo enviar la respuesta");
  return res.data ?? { ok: false };
}
