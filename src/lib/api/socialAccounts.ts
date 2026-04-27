import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";
import type { PublishPlatform } from "@/lib/publishing/platformLimits";

export type SocialAccount = Tables<"social_accounts">;

/** Public-safe view of a social account (without tokens). */
export type SocialAccountPublic = Omit<SocialAccount, "access_token" | "refresh_token">;

const PUBLIC_FIELDS = [
  "id",
  "owner_id",
  "platform",
  "external_account_id",
  "display_name",
  "avatar_url",
  "meta",
  "scopes",
  "status",
  "connected_at",
  "last_used_at",
  "token_expires_at",
  "updated_at",
].join(", ");

export async function fetchSocialAccounts(): Promise<SocialAccountPublic[]> {
  const { data, error } = await supabase
    .from("social_accounts")
    .select(PUBLIC_FIELDS)
    .order("platform", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as SocialAccountPublic[];
}

export async function fetchSocialAccount(
  platform: PublishPlatform,
): Promise<SocialAccountPublic | null> {
  const { data, error } = await supabase
    .from("social_accounts")
    .select(PUBLIC_FIELDS)
    .eq("platform", platform)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as SocialAccountPublic) ?? null;
}

export async function deleteSocialAccount(id: string): Promise<void> {
  const { error } = await supabase.from("social_accounts").delete().eq("id", id);
  if (error) throw error;
}
