// generate-youtube-structure — (M26) idea (text/audio) + length → estructura del
// video largo (intro/capítulos/CTA con puntos + tiempos) + 5 títulos, vía Claude
// con el prompt editable youtube.structure + el perfil del creator (M22).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import {
  buildCreatorProfileBlock,
  type CreatorProfileRow,
  EMIT_STRUCTURE_TOOL,
  LENGTH_TARGET_SECONDS,
  YOUTUBE_STRUCTURE_DEFAULT,
} from "./youtube-structure-prompt.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const CLAUDE_MODEL = "claude-sonnet-4-6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function decodeUnicodeEscapes<T>(value: T): T {
  if (typeof value === "string") {
    return value
      .replace(/\\u([dD][89aAbB][0-9a-fA-F]{2})\\u([dD][c-fC-F][0-9a-fA-F]{2})/g, (_m, hi, lo) => String.fromCharCode(parseInt(hi, 16), parseInt(lo, 16)))
      .replace(/\\u([0-9a-fA-F]{4})/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16))) as T;
  }
  if (Array.isArray(value)) return value.map((v) => decodeUnicodeEscapes(v)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = decodeUnicodeEscapes(v);
    return out as T;
  }
  return value;
}

async function transcribe(blob: Blob, filename: string): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY no configurado");
  const fd = new FormData();
  fd.append("file", blob, filename);
  fd.append("model", "whisper-1");
  fd.append("language", "es");
  fd.append("response_format", "json");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: fd,
  });
  if (!res.ok) throw new Error(`Whisper ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return ((await res.json()) as { text: string }).text;
}

interface StructureResult {
  titles: string[];
  sections: Array<{ kind: "intro" | "chapter" | "cta"; title: string; points: string; duration_seconds: number }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    if (!ANTHROPIC_API_KEY) return json({ error: "ANTHROPIC_API_KEY no configurado" }, 500);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization" }, 401);
    const userClient: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const projectId = typeof body?.youtube_project_id === "string" ? body.youtube_project_id : null;
    const ideaInput = typeof body?.idea === "string" ? body.idea.trim() : "";
    const audioUploadId = typeof body?.audio_upload_id === "string" ? body.audio_upload_id : null;
    const lengthTier = ["short", "medium", "long"].includes(body?.length_tier) ? body.length_tier as string : "medium";

    // Transcribe audio if provided.
    let transcript = "";
    if (audioUploadId) {
      const { data: audio } = await userClient.from("audio_uploads").select("*").eq("id", audioUploadId).single();
      if (audio) {
        if (audio.transcript_status === "done" && audio.transcript) {
          transcript = audio.transcript;
        } else {
          const { data: signed } = await userClient.storage.from("audio-ideas").createSignedUrl(audio.storage_path, 600);
          if (signed?.signedUrl) {
            const r = await fetch(signed.signedUrl);
            if (r.ok) {
              transcript = await transcribe(await r.blob(), audio.storage_path.split("/").pop() ?? "audio.webm");
              await userClient.from("audio_uploads").update({ transcript, transcript_status: "done" }).eq("id", audioUploadId);
            }
          }
        }
      }
    }

    const idea = [transcript, ideaInput].filter(Boolean).join("\n\n").trim();
    if (!idea) return json({ error: "Falta la idea (texto o audio)." }, 400);

    // Resolve the editable system prompt (override or default).
    const { data: override } = await userClient
      .from("prompt_overrides")
      .select("content")
      .eq("slug", "youtube.structure")
      .maybeSingle();
    const systemBase = override?.content ?? YOUTUBE_STRUCTURE_DEFAULT;

    const { data: cp } = await userClient
      .from("creator_profile")
      .select("product_service, target_audience, long_form_strategy, who_am_i, what_i_transmit")
      .eq("owner_id", user.id)
      .maybeSingle();
    const profileBlock = buildCreatorProfileBlock(cp as CreatorProfileRow | null);

    const [minS, maxS] = LENGTH_TARGET_SECONDS[lengthTier];
    const userMsg = [
      `Duración objetivo: ${lengthTier} (${Math.round(minS / 60)}-${Math.round(maxS / 60)} min).`,
      "",
      "=== IDEA DEL CREATOR ===",
      idea,
    ].join("\n");

    const system = [
      { type: "text", text: systemBase, cache_control: { type: "ephemeral" } },
      ...(profileBlock ? [{ type: "text", text: profileBlock, cache_control: { type: "ephemeral" } }] : []),
    ];

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 4000,
        system,
        tools: [EMIT_STRUCTURE_TOOL],
        tool_choice: { type: "tool", name: "emit_youtube_structure" },
        messages: [{ role: "user", content: userMsg }],
      }),
    });
    if (!res.ok) return json({ error: `Claude ${res.status}: ${(await res.text()).slice(0, 400)}` }, 502);
    const data = (await res.json()) as { content: Array<{ type: string; name?: string; input?: StructureResult }> };
    const toolUse = data.content.find((b) => b.type === "tool_use" && b.name === "emit_youtube_structure");
    if (!toolUse?.input) return json({ error: "Claude no devolvió la estructura" }, 502);
    const result = decodeUnicodeEscapes(toolUse.input);

    // Upsert the project.
    const projectPayload = {
      owner_id: user.id,
      idea,
      length_tier: lengthTier,
      title: result.titles?.[0] ?? null,
      title_options: result.titles ?? [],
      audio_upload_id: audioUploadId,
      status: "structured",
      structure_status: "done",
      structure_error: null,
    };
    let resolvedProjectId = projectId;
    if (projectId) {
      const { error } = await userClient.from("youtube_projects").update(projectPayload).eq("id", projectId);
      if (error) return json({ error: `Project update failed: ${error.message}` }, 500);
    } else {
      const { data: created, error } = await userClient.from("youtube_projects").insert(projectPayload).select("id").single();
      if (error || !created) return json({ error: `Project insert failed: ${error?.message}` }, 500);
      resolvedProjectId = created.id;
    }

    // Replace sections.
    await userClient.from("youtube_project_sections").delete().eq("project_id", resolvedProjectId);
    const sections = (result.sections ?? []).map((s, i) => ({
      project_id: resolvedProjectId,
      owner_id: user.id,
      position: i,
      kind: s.kind,
      title: s.title,
      points: s.points,
      duration_seconds: s.duration_seconds,
      // Default per transcript: intro + first 3 sections = creator, rest = clone.
      recorder: i <= 3 ? "creator" : "clone",
    }));
    if (sections.length > 0) {
      const { error: insErr } = await userClient.from("youtube_project_sections").insert(sections);
      if (insErr) return json({ error: `Sections insert failed: ${insErr.message}` }, 500);
    }

    return json({ ok: true, project_id: resolvedProjectId, sections: sections.length });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
