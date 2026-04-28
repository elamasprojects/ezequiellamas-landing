import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

export type IdeaReference = Database["public"]["Tables"]["idea_references"]["Row"];

interface ScrapeOk {
  reference: IdeaReference;
  cached: boolean;
}

interface ScrapeErr {
  error: string;
  reference_id?: string;
}

export async function scrapeIdeaReference(input: {
  url: string;
  force?: boolean;
}): Promise<ScrapeOk> {
  const { data, error } = await supabase.functions.invoke<ScrapeOk | ScrapeErr>(
    "scrape-idea-reference",
    { body: input },
  );
  if (error) {
    // Edge function devolvió error HTTP; intentamos extraer mensaje del body si vino.
    const ctx = (error as { context?: { error?: string } }).context;
    const msg = ctx?.error ?? error.message ?? "scrape-idea-reference failed";
    throw new Error(msg);
  }
  if (!data) throw new Error("Empty response");
  if ("error" in data) throw new Error(data.error);
  return data;
}

export async function getIdeaReference(id: string): Promise<IdeaReference> {
  const { data, error } = await supabase
    .from("idea_references")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}
