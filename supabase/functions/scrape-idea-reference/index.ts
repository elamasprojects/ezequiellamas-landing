// scrape-idea-reference — toma una URL pública de IG/YT/TT, la scrapea con Apify,
// extrae transcript (YT subs si hay, si no Whisper sobre el audio del raw) y persiste
// en `idea_references`. Idempotente por (owner_id, normalized_url).
//
// Diseñado para alimentar `/ideas/new` con un link de referencia. Sin ownership
// constraint sobre el video (a diferencia de `analyze-referent-video`).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const APIFY_TOKEN_GLOBAL = Deno.env.get("APIFY_API_KEY");
const APIFY_TOKEN_INSTAGRAM =
  APIFY_TOKEN_GLOBAL || Deno.env.get("APIFY_API_KEY_INSTAGRAM");
const APIFY_TOKEN_YOUTUBE =
  APIFY_TOKEN_GLOBAL || Deno.env.get("APIFY_API_KEY_YOUTUBE");
const APIFY_TOKEN_TIKTOK =
  APIFY_TOKEN_GLOBAL || Deno.env.get("APIFY_API_KEY_TIKTOK");

const APIFY_BASE = "https://api.apify.com/v2/acts";
const WHISPER_MAX_BYTES = 25 * 1024 * 1024;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// URL parsing — espejo de src/lib/parseVideoUrl.ts
// ---------------------------------------------------------------------------

type Platform = "instagram" | "youtube" | "tiktok";

interface ParsedVideoUrl {
  platform: Platform;
  short_code: string | null;
  normalized_url: string;
}

function parseVideoUrl(input: string): ParsedVideoUrl | null {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, "");

  if (host === "instagram.com" || host.endsWith(".instagram.com")) {
    const m = u.pathname.match(/^\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
    if (!m) return null;
    const kind = m[1] === "reels" ? "reel" : m[1];
    return {
      platform: "instagram",
      short_code: m[2],
      normalized_url: `https://www.instagram.com/${kind}/${m[2]}/`,
    };
  }

  if (host === "youtu.be") {
    const id = u.pathname.replace(/^\//, "").split("/")[0];
    if (!id) return null;
    return {
      platform: "youtube",
      short_code: id,
      normalized_url: `https://www.youtube.com/watch?v=${id}`,
    };
  }
  if (host === "youtube.com" || host.endsWith(".youtube.com")) {
    const shorts = u.pathname.match(/^\/shorts\/([A-Za-z0-9_-]+)/);
    if (shorts) {
      return {
        platform: "youtube",
        short_code: shorts[1],
        normalized_url: `https://www.youtube.com/watch?v=${shorts[1]}`,
      };
    }
    const embed = u.pathname.match(/^\/(embed|v)\/([A-Za-z0-9_-]+)/);
    if (embed) {
      return {
        platform: "youtube",
        short_code: embed[2],
        normalized_url: `https://www.youtube.com/watch?v=${embed[2]}`,
      };
    }
    if (u.pathname === "/watch" && u.searchParams.get("v")) {
      const id = u.searchParams.get("v")!;
      return {
        platform: "youtube",
        short_code: id,
        normalized_url: `https://www.youtube.com/watch?v=${id}`,
      };
    }
    return null;
  }

  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
    const full = u.pathname.match(/^\/@[^/]+\/video\/(\d+)/);
    if (full) {
      return {
        platform: "tiktok",
        short_code: full[1],
        normalized_url: `https://www.tiktok.com${u.pathname.replace(/\/$/, "")}`,
      };
    }
    if (host === "vm.tiktok.com" || host === "vt.tiktok.com") {
      return {
        platform: "tiktok",
        short_code: null,
        normalized_url: `https://${host}${u.pathname.replace(/\/$/, "")}`,
      };
    }
    return null;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Apify
// ---------------------------------------------------------------------------

async function callApify(
  actor: string,
  token: string,
  input: unknown,
): Promise<unknown[]> {
  const url = `${APIFY_BASE}/${actor}/run-sync-get-dataset-items?token=${token}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Apify ${res.status} (${actor}): ${errText.slice(0, 500)}`);
  }
  return (await res.json()) as unknown[];
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function roundOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null;
}
function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}
function parseDate(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}
function parseHmsToSeconds(v: unknown): number | null {
  if (typeof v !== "string") return num(v);
  const parts = v.split(":").map((p) => parseInt(p, 10)).filter((n) => Number.isFinite(n));
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

interface MappedItem {
  source_url: string;
  apify_short_code: string | null;
  posted_at: string | null;
  title: string | null;
  caption: string | null;
  thumbnail_url: string | null;
  video_duration: number | null;
}

async function scrapeInstagram(normalizedUrl: string): Promise<{ raw: Record<string, unknown>; mapped: MappedItem }> {
  if (!APIFY_TOKEN_INSTAGRAM) throw new Error("APIFY_API_KEY no configurado");
  const items = await callApify("apify~instagram-scraper", APIFY_TOKEN_INSTAGRAM, {
    directUrls: [normalizedUrl],
    resultsType: "posts",
    resultsLimit: 1,
    addParentData: false,
  });
  const raw = (items[0] ?? null) as Record<string, unknown> | null;
  if (!raw) throw new Error("Instagram: Apify devolvió 0 items");
  const shortCode = str(raw.shortCode);
  const url = str(raw.url) ?? (shortCode ? `https://www.instagram.com/p/${shortCode}/` : normalizedUrl);
  return {
    raw,
    mapped: {
      source_url: url,
      apify_short_code: shortCode,
      posted_at: parseDate(raw.timestamp),
      title: null,
      caption: str(raw.caption),
      thumbnail_url: str(raw.displayUrl),
      video_duration: roundOrNull(raw.videoDuration),
    },
  };
}

async function scrapeYouTube(normalizedUrl: string): Promise<{ raw: Record<string, unknown>; mapped: MappedItem }> {
  if (!APIFY_TOKEN_YOUTUBE) throw new Error("APIFY_API_KEY no configurado");
  const items = await callApify("streamers~youtube-scraper", APIFY_TOKEN_YOUTUBE, {
    startUrls: [{ url: normalizedUrl }],
    maxResults: 1,
    maxResultsShorts: 1,
    maxResultStreams: 0,
    subtitles: true,
  });
  const raw = (items[0] ?? null) as Record<string, unknown> | null;
  if (!raw) throw new Error("YouTube: Apify devolvió 0 items");
  const id = str(raw.id);
  const url = str(raw.url) ?? normalizedUrl;
  return {
    raw,
    mapped: {
      source_url: url,
      apify_short_code: id,
      posted_at: parseDate(raw.date),
      title: str(raw.title),
      caption: str(raw.text),
      thumbnail_url: str(raw.thumbnailUrl),
      video_duration: parseHmsToSeconds(raw.duration),
    },
  };
}

async function scrapeTikTok(normalizedUrl: string): Promise<{ raw: Record<string, unknown>; mapped: MappedItem }> {
  if (!APIFY_TOKEN_TIKTOK) throw new Error("APIFY_API_KEY no configurado");
  const items = await callApify("clockworks~tiktok-scraper", APIFY_TOKEN_TIKTOK, {
    postURLs: [normalizedUrl],
    resultsPerPage: 1,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
    shouldDownloadSubtitles: false,
    shouldDownloadSlideshowImages: false,
    shouldDownloadAvatars: false,
    shouldDownloadMusicCovers: false,
  });
  const raw = (items[0] ?? null) as Record<string, unknown> | null;
  if (!raw) throw new Error("TikTok: Apify devolvió 0 items");
  const id = str(raw.id);
  const url = str(raw.webVideoUrl) ?? normalizedUrl;
  const videoMeta = raw.videoMeta as Record<string, unknown> | undefined;
  const covers = raw.covers as Record<string, unknown> | undefined;
  const thumb =
    str(videoMeta?.coverUrl) ||
    str(videoMeta?.originalCoverUrl) ||
    str(covers?.origin) ||
    str(covers?.default);
  return {
    raw,
    mapped: {
      source_url: url,
      apify_short_code: id,
      posted_at: parseDate(raw.createTimeISO),
      title: null,
      caption: str(raw.text),
      thumbnail_url: thumb,
      video_duration: roundOrNull(videoMeta?.duration),
    },
  };
}

// ---------------------------------------------------------------------------
// SRT parsing for YouTube auto-subtitles
// ---------------------------------------------------------------------------

function parseSrt(text: string): string {
  return text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter(
      (line) =>
        line.trim().length > 0 && !/^\d+$/.test(line.trim()) && !/-->/.test(line),
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

interface YtSubtitle {
  language?: string;
  url?: string;
  text?: string;
  srt?: string;
  vtt?: string;
}

async function ytSubtitlesToText(
  raw: Record<string, unknown>,
): Promise<{ text: string; language: string } | null> {
  const subs = (raw.subtitles ?? raw.captions ?? []) as YtSubtitle[];
  if (!Array.isArray(subs) || subs.length === 0) return null;
  const score = (s: YtSubtitle) => {
    const lang = (s.language ?? "").toLowerCase();
    if (lang.includes("es-auto")) return 4;
    if (lang.startsWith("es")) return 3;
    if (lang.includes("auto")) return 2;
    return 1;
  };
  const sorted = [...subs].sort((a, b) => score(b) - score(a));
  for (const s of sorted) {
    let body = s.srt ?? s.vtt ?? s.text ?? null;
    if (!body && s.url) {
      try {
        const res = await fetch(s.url);
        if (res.ok) body = await res.text();
      } catch (_e) {
        body = null;
      }
    }
    if (!body) continue;
    const text = parseSrt(body);
    if (text.length > 20) {
      return { text, language: s.language ?? "es" };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Audio download + Whisper
// ---------------------------------------------------------------------------

function pickMediaUrl(platform: Platform, raw: Record<string, unknown>): string | null {
  if (platform === "instagram") {
    return (
      (raw.audioUrl as string | undefined) ??
      (raw.videoUrl as string | undefined) ??
      null
    );
  }
  if (platform === "tiktok") {
    const videoMeta = raw.videoMeta as Record<string, unknown> | undefined;
    return (
      (raw.videoUrl as string | undefined) ??
      (Array.isArray(raw.mediaUrls) && (raw.mediaUrls as string[])[0]) ??
      (videoMeta?.playApi as string | undefined) ??
      (videoMeta?.downloadAddr as string | undefined) ??
      null
    );
  }
  return null;
}

async function downloadMedia(url: string): Promise<{ blob: Blob; bytes: number }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download ${res.status} ${url.slice(0, 100)}`);
  const blob = await res.blob();
  return { blob, bytes: blob.size };
}

async function transcribeWithWhisper(
  blob: Blob,
  filename: string,
): Promise<{ text: string; language: string }> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY no configurado");
  const fd = new FormData();
  fd.append("file", blob, filename);
  fd.append("model", "whisper-1");
  fd.append("language", "es");
  fd.append("response_format", "verbose_json");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: fd,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Whisper ${res.status}: ${t.slice(0, 500)}`);
  }
  const data = (await res.json()) as { text: string; language?: string };
  return { text: data.text, language: data.language ?? "es" };
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

interface IdeaReferenceRow {
  id: string;
  owner_id: string;
  source_url: string;
  normalized_url: string;
  platform: Platform;
  apify_short_code: string | null;
  title: string | null;
  caption: string | null;
  thumbnail_url: string | null;
  video_duration: number | null;
  posted_at: string | null;
  transcript: string | null;
  transcript_language: string | null;
  transcript_status: "pending" | "processing" | "done" | "failed";
  transcript_error: string | null;
  raw: Record<string, unknown> | null;
  last_scraped_at: string | null;
  created_at: string;
  updated_at: string;
}

async function markFailed(
  client: SupabaseClient,
  id: string,
  error: string,
) {
  await client
    .from("idea_references")
    .update({
      transcript_status: "failed",
      transcript_error: error.slice(0, 500),
    })
    .eq("id", id);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let referenceId: string | null = null;
  let userClient: SupabaseClient | null = null;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization" }, 401);

    userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthenticated" }, 401);

    // Admin role gating (RLS también lo refuerza, pero fallamos rápido aquí).
    const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (roleErr || !isAdmin) return json({ error: "admin role required" }, 403);

    const body = await req.json().catch(() => ({}));
    const url = typeof body?.url === "string" ? body.url.trim() : "";
    const force = !!body?.force;
    if (!url) return json({ error: "url is required" }, 400);

    const parsed = parseVideoUrl(url);
    if (!parsed) {
      return json({ error: "URL no reconocida (IG/YT/TT)" }, 400);
    }

    // Idempotencia: si ya está done y no es force, devolvemos cached.
    const { data: existing } = await userClient
      .from("idea_references")
      .select("*")
      .eq("owner_id", user.id)
      .eq("normalized_url", parsed.normalized_url)
      .maybeSingle();

    if (existing && existing.transcript_status === "done" && !force) {
      return json({ reference: existing as IdeaReferenceRow, cached: true });
    }

    // Upsert en processing (si existe pero falló o force=true, lo reseteamos).
    const baseRow = {
      owner_id: user.id,
      source_url: existing?.source_url ?? url,
      normalized_url: parsed.normalized_url,
      platform: parsed.platform,
      apify_short_code: existing?.apify_short_code ?? parsed.short_code ?? null,
      transcript_status: "processing" as const,
      transcript_error: null,
    };
    const { data: row, error: upErr } = await userClient
      .from("idea_references")
      .upsert(baseRow, { onConflict: "owner_id,normalized_url" })
      .select("*")
      .single();
    if (upErr || !row) {
      return json({ error: upErr?.message ?? "upsert failed" }, 500);
    }
    referenceId = row.id;

    // 1. Apify scrape
    let scraped: { raw: Record<string, unknown>; mapped: MappedItem };
    try {
      if (parsed.platform === "instagram") {
        scraped = await scrapeInstagram(parsed.normalized_url);
      } else if (parsed.platform === "youtube") {
        scraped = await scrapeYouTube(parsed.normalized_url);
      } else {
        scraped = await scrapeTikTok(parsed.normalized_url);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await markFailed(userClient, row.id, msg);
      return json({ error: msg, reference_id: row.id }, 502);
    }

    // 2. Transcript
    let transcript = "";
    let language = "es";
    try {
      if (parsed.platform === "youtube") {
        const yt = await ytSubtitlesToText(scraped.raw);
        if (yt) {
          transcript = yt.text;
          language = yt.language;
        } else {
          await markFailed(
            userClient,
            row.id,
            "YouTube sin subtítulos disponibles. Probá con otro video.",
          );
          return json(
            {
              error: "YouTube sin subtítulos disponibles. Probá con otro video.",
              reference_id: row.id,
            },
            422,
          );
        }
      } else {
        const mediaUrl = pickMediaUrl(parsed.platform, scraped.raw);
        if (!mediaUrl) {
          await markFailed(userClient, row.id, "Sin URL de audio/video en el scrape.");
          return json({ error: "Sin URL de audio/video en el scrape.", reference_id: row.id }, 422);
        }
        const { blob, bytes } = await downloadMedia(mediaUrl);
        if (bytes > WHISPER_MAX_BYTES) {
          const msg = `Audio demasiado grande para Whisper (${(bytes / 1024 / 1024).toFixed(1)}MB > 25MB)`;
          await markFailed(userClient, row.id, msg);
          return json({ error: msg, reference_id: row.id }, 422);
        }
        const result = await transcribeWithWhisper(blob, `idea-ref-${row.id}.mp4`);
        transcript = result.text;
        language = result.language;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await markFailed(userClient, row.id, msg);
      return json({ error: msg, reference_id: row.id }, 502);
    }

    if (!transcript || transcript.trim().length < 10) {
      await markFailed(userClient, row.id, "Transcript vacío.");
      return json({ error: "Transcript vacío.", reference_id: row.id }, 422);
    }

    // 3. Persist done
    const { data: done, error: doneErr } = await userClient
      .from("idea_references")
      .update({
        source_url: scraped.mapped.source_url,
        apify_short_code: scraped.mapped.apify_short_code,
        title: scraped.mapped.title,
        caption: scraped.mapped.caption,
        thumbnail_url: scraped.mapped.thumbnail_url,
        video_duration: scraped.mapped.video_duration,
        posted_at: scraped.mapped.posted_at,
        transcript,
        transcript_language: language,
        transcript_status: "done",
        transcript_error: null,
        raw: scraped.raw,
        last_scraped_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .select("*")
      .single();
    if (doneErr || !done) {
      await markFailed(userClient, row.id, doneErr?.message ?? "update failed");
      return json({ error: doneErr?.message ?? "update failed", reference_id: row.id }, 500);
    }

    return json({ reference: done as IdeaReferenceRow, cached: false });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (referenceId && userClient) {
      try {
        await markFailed(userClient, referenceId, msg);
      } catch (_e) {
        // ignore
      }
    }
    return json({ error: msg }, 500);
  }
});
