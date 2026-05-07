import { supabase } from "@/lib/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";

export type CoverAsset = Tables<"cover_assets">;
export type CoverAssetInsert = TablesInsert<"cover_assets">;
export type CoverAssetUpdate = TablesUpdate<"cover_assets">;

export type CoverAssetType = "founder_photo" | "logo" | "other";

export const ASSET_TYPE_LABEL: Record<CoverAssetType, string> = {
  founder_photo: "Foto del founder",
  logo: "Logo",
  other: "Otro",
};

export async function fetchCoverAssets(): Promise<CoverAsset[]> {
  const { data, error } = await supabase
    .from("cover_assets")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createCoverAsset(
  input: Pick<CoverAssetInsert, "name" | "asset_type" | "url" | "storage_path">,
  ownerId: string,
): Promise<CoverAsset> {
  const { data, error } = await supabase
    .from("cover_assets")
    .insert({ ...input, owner_id: ownerId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCoverAsset(id: string, input: CoverAssetUpdate): Promise<CoverAsset> {
  const { data, error } = await supabase
    .from("cover_assets")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCoverAsset(id: string): Promise<void> {
  const { error } = await supabase.from("cover_assets").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadCoverAssetFile(
  assetId: string,
  ownerId: string,
  file: File,
): Promise<{ storage_path: string; url: string }> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${ownerId}/${assetId}.${ext}`;
  const { error: uploadErr } = await supabase.storage
    .from("cover-assets")
    .upload(path, file, { upsert: true });
  if (uploadErr) throw uploadErr;
  const { data } = await supabase.storage.from("cover-assets").createSignedUrl(path, 365 * 24 * 3600);
  const url = data?.signedUrl ?? "";
  await supabase.from("cover_assets").update({ storage_path: path, url }).eq("id", assetId);
  return { storage_path: path, url };
}

export async function getSignedAssetUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("cover-assets")
    .createSignedUrl(storagePath, 4 * 3600);
  if (error) throw error;
  return data.signedUrl;
}
