import { supabase } from "@/lib/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";

export type Cover = Tables<"covers">;
export type CoverInsert = TablesInsert<"covers">;
export type CoverUpdate = TablesUpdate<"covers">;

export type CoverStatus = "idle" | "generating" | "done" | "failed" | "editing";
export type CoverAspectRatio = "9:16" | "16:9" | "1:1";
export type CoverQuality = "standard" | "premium";

export interface CoverWithRelations extends Cover {
  cover_styles: { id: string; name: string } | null;
  scripts: { id: string; title: string | null; hook: string | null } | null;
  videos: { id: string; title: string | null } | null;
  series: { id: string; name: string } | null;
}

// Defensa contra promesas colgadas: el cliente Supabase a veces deja una
// request en pending indefinidamente (SW intercepta, refresh de token en
// deadlock, etc). Cortamos a los 15s para que React Query pueda retry/error.
function withTimeout<T>(p: Promise<T>, ms = 15_000, label = "supabase"): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label}_timeout_${ms}ms`)), ms),
    ),
  ]);
}

// Supabase devuelve errores como objeto plano { message, code, details, hint }
// — no como Error. Lo envolvemos para que llegue al UI con .message legible
// y la causa original quede en `cause` para inspección en DevTools.
function wrapSupabaseError(label: string, err: unknown): Error {
  console.error(`[${label}]`, err);
  if (err instanceof Error) return err;
  if (typeof err === "object" && err !== null) {
    const obj = err as Record<string, unknown>;
    const parts = [String(obj.message ?? `${label}_error`)];
    if (obj.code) parts.push(`(code ${obj.code})`);
    if (obj.hint) parts.push(`— hint: ${obj.hint}`);
    if (obj.details) parts.push(`— ${obj.details}`);
    const wrapped = new Error(parts.join(" "));
    (wrapped as Error & { cause?: unknown }).cause = err;
    return wrapped;
  }
  return new Error(`${label}_error: ${String(err)}`);
}

export async function fetchCovers(): Promise<CoverWithRelations[]> {
  const { data, error } = await withTimeout(
    supabase
      .from("covers")
      .select("*, cover_styles!cover_style_id(id, name), scripts(id, title, hook), videos(id, title), series(id, name)")
      .order("created_at", { ascending: false }),
    15_000,
    "fetch_covers",
  );
  if (error) throw wrapSupabaseError("fetchCovers", error);
  return (data ?? []) as CoverWithRelations[];
}

export async function fetchCover(id: string): Promise<CoverWithRelations | null> {
  const { data, error } = await withTimeout(
    supabase
      .from("covers")
      .select("*, cover_styles!cover_style_id(id, name), scripts(id, title, hook), videos(id, title), series(id, name)")
      .eq("id", id)
      .maybeSingle(),
    15_000,
    "fetch_cover",
  );
  if (error) throw wrapSupabaseError("fetchCover", error);
  return data as CoverWithRelations | null;
}

export async function createCover(
  input: Pick<CoverInsert, "title" | "script_id" | "video_id" | "cover_style_id" | "series_id" | "aspect_ratio">,
  ownerId: string,
): Promise<Cover> {
  const { data, error } = await supabase
    .from("covers")
    .insert({ ...input, owner_id: ownerId, status: "idle" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCover(id: string, input: CoverUpdate): Promise<Cover> {
  const { data, error } = await supabase
    .from("covers")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCover(id: string): Promise<void> {
  const { error } = await supabase.from("covers").delete().eq("id", id);
  if (error) throw error;
}

export async function getSignedCoverUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("cover-renders")
    .createSignedUrl(storagePath, 4 * 3600);
  if (error) throw error;
  return data.signedUrl;
}

// Edge function calls

export interface GenerateCoverResult {
  generated_image_url: string;
  idea_fuerza: string;
  model?: string;
  image_to_image?: boolean;
}

export async function generateCover(
  coverId: string,
  opts?: { force?: boolean; quality?: CoverQuality },
): Promise<GenerateCoverResult> {
  const { data, error } = await supabase.functions.invoke<GenerateCoverResult>(
    "generate-cover",
    {
      body: {
        cover_id: coverId,
        force: opts?.force ?? false,
        quality: opts?.quality ?? "standard",
      },
    },
  );
  if (error) throw new Error(error.message ?? "generate_cover_failed");
  if (!data?.generated_image_url) throw new Error("no_image_url_returned");
  return data;
}

export async function editCover(
  coverId: string,
  instruction: string,
  opts?: { quality?: CoverQuality },
): Promise<GenerateCoverResult> {
  const { data, error } = await supabase.functions.invoke<GenerateCoverResult>(
    "generate-cover",
    {
      body: {
        cover_id: coverId,
        instruction,
        force: true,
        quality: opts?.quality ?? "standard",
      },
    },
  );
  if (error) throw new Error(error.message ?? "edit_cover_failed");
  if (!data?.generated_image_url) throw new Error("no_image_url_returned");
  return data;
}

export async function suggestCoverStyle(
  source: { cover_id: string } | { script_id?: string; video_id?: string },
): Promise<{ suggested_style_id: string; reasoning: string }> {
  const { data, error } = await supabase.functions.invoke<{
    suggested_style_id: string;
    reasoning: string;
  }>("suggest-cover-style", { body: source });
  if (error) throw new Error(error.message ?? "suggest_style_failed");
  if (!data?.suggested_style_id) throw new Error("no_suggestion_returned");
  return data;
}
