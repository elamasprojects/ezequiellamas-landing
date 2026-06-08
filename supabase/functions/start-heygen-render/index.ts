// start-heygen-render — (M26) generates an AI-clone video segment for a project
// section via HeyGen (avatar) with one of three audio modes:
//   avatar      → HeyGen text-to-speech with the configured voice
//   elevenlabs  → synthesize the narration with ElevenLabs, feed as audio
//   record      → use the creator's recorded audio (recorded_audio_path)
// Stores heygen_video_id + clone_status='generating'; the heygen-webhook finishes it.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const HEYGEN_API_KEY = Deno.env.get("HEYGEN_API_KEY");
const HEYGEN_AVATAR_ID = Deno.env.get("HEYGEN_AVATAR_ID");
const HEYGEN_VOICE_ID = Deno.env.get("HEYGEN_VOICE_ID");
const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
const ELEVENLABS_VOICE_ID = Deno.env.get("ELEVENLABS_VOICE_ID");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// Synthesize narration with ElevenLabs and upload to the youtube-clone-audio
// bucket; returns a signed URL HeyGen can fetch.
async function elevenLabsAudioUrl(client: SupabaseClient, ownerId: string, sectionId: string, text: string): Promise<string> {
  if (!ELEVENLABS_API_KEY || !ELEVENLABS_VOICE_ID) {
    throw new Error("ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID no configurados.");
  }
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
    method: "POST",
    headers: { "xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
  });
  if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const bytes = new Uint8Array(await r.arrayBuffer());
  const path = `${ownerId}/${sectionId}.mp3`;
  const { error: upErr } = await client.storage.from("youtube-clone-audio").upload(path, bytes, { contentType: "audio/mpeg", upsert: true });
  if (upErr) throw new Error(`Audio upload failed: ${upErr.message}`);
  const { data: signed, error: sErr } = await client.storage.from("youtube-clone-audio").createSignedUrl(path, 60 * 60);
  if (sErr || !signed?.signedUrl) throw new Error(sErr?.message ?? "No se pudo firmar el audio");
  return signed.signedUrl;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    if (!HEYGEN_API_KEY || !HEYGEN_AVATAR_ID) {
      return json({ error: "HEYGEN_API_KEY / HEYGEN_AVATAR_ID no configurados." }, 500);
    }
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization" }, 401);
    const userClient: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const sectionId = typeof body?.section_id === "string" ? body.section_id : null;
    if (!sectionId) return json({ error: "section_id is required" }, 400);

    const { data: section, error: sErr } = await userClient
      .from("youtube_project_sections")
      .select("id, owner_id, points, audio_mode, recorded_audio_path")
      .eq("id", sectionId)
      .single();
    if (sErr || !section) return json({ error: sErr?.message ?? "Section not found" }, 404);

    const text = (section.points ?? "").trim();
    const mode = section.audio_mode ?? "elevenlabs";
    if (mode !== "record" && !text) {
      return json({ error: "La sección no tiene guion para narrar." }, 400);
    }

    await userClient.from("youtube_project_sections").update({ clone_status: "pending", clone_error: null }).eq("id", sectionId);

    // Build the HeyGen voice config per audio mode.
    let voice: Record<string, unknown>;
    if (mode === "avatar") {
      voice = { type: "text", input_text: text, voice_id: HEYGEN_VOICE_ID ?? undefined };
    } else if (mode === "record") {
      if (!section.recorded_audio_path) return json({ error: "No hay audio grabado para esta sección." }, 400);
      const { data: signed } = await userClient.storage.from("youtube-clone-audio").createSignedUrl(section.recorded_audio_path, 60 * 60);
      if (!signed?.signedUrl) return json({ error: "No se pudo firmar el audio grabado." }, 500);
      voice = { type: "audio", audio_url: signed.signedUrl };
    } else {
      // elevenlabs
      let audioUrl: string;
      try {
        audioUrl = await elevenLabsAudioUrl(userClient, user.id, sectionId, text);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await userClient.from("youtube_project_sections").update({ clone_status: "failed", clone_error: msg.slice(0, 400) }).eq("id", sectionId);
        return json({ error: msg }, 502);
      }
      voice = { type: "audio", audio_url: audioUrl };
    }

    const res = await fetch("https://api.heygen.com/v2/video/generate", {
      method: "POST",
      headers: { "X-Api-Key": HEYGEN_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        video_inputs: [{
          character: { type: "avatar", avatar_id: HEYGEN_AVATAR_ID, avatar_style: "normal" },
          voice,
        }],
        dimension: { width: 1280, height: 720 },
        callback_id: sectionId,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      await userClient.from("youtube_project_sections").update({ clone_status: "failed", clone_error: `HeyGen ${res.status}: ${t.slice(0, 300)}` }).eq("id", sectionId);
      return json({ error: `HeyGen ${res.status}: ${t.slice(0, 400)}` }, 502);
    }
    const data = (await res.json()) as { data?: { video_id?: string }; error?: unknown };
    const videoId = data.data?.video_id;
    if (!videoId) {
      await userClient.from("youtube_project_sections").update({ clone_status: "failed", clone_error: "HeyGen no devolvió video_id" }).eq("id", sectionId);
      return json({ error: "HeyGen no devolvió video_id" }, 502);
    }

    await userClient
      .from("youtube_project_sections")
      .update({ heygen_video_id: videoId, clone_status: "generating", clone_error: null })
      .eq("id", sectionId);

    return json({ ok: true, heygen_video_id: videoId });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
