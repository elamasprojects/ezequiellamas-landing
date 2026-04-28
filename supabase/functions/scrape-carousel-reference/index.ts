// scrape-carousel-reference — toma un link a un carrusel IG (/p/) o TT (/photo/),
// scrapea con Apify, baja cada slide al bucket carousel-reference-slides y manda
// las imágenes a Claude vision para extraer texto + síntesis del concepto.
//
// Persiste en `carousel_references`. Idempotente por (owner_id, normalized_url).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const APIFY_TOKEN_GLOBAL = Deno.env.get("APIFY_API_KEY");
const APIFY_TOKEN_INSTAGRAM =
  APIFY_TOKEN_GLOBAL || Deno.env.get("APIFY_API_KEY_INSTAGRAM");
const APIFY_TOKEN_TIKTOK =
  APIFY_TOKEN_GLOBAL || Deno.env.get("APIFY_API_KEY_TIKTOK");

const APIFY_BASE = "https://api.apify.com/v2/acts";
const CLAUDE_MODEL = "claude-sonnet-4-6";
const SLIDES_BUCKET = "carousel-reference-slides";
const MAX_SLIDES = 12; // Cap para no romper a Claude con demasiadas imágenes.

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

// Claude's tool_use input occasionally arrives with literal `\uXXXX` sequences
// (6 chars: '\','u','0','0','e','1') instead of decoded characters (e.g. 'á').
// Walk the parsed tool input and decode them so accented Spanish prose is
// stored correctly. Handles surrogate pairs for non-BMP code points.
function decodeUnicodeEscapes<T>(value: T): T {
  if (typeof value === "string") {
    return value
      .replace(
        /\\u([dD][89aAbB][0-9a-fA-F]{2})\\u([dD][c-fC-F][0-9a-fA-F]{2})/g,
        (_m, hi, lo) =>
          String.fromCharCode(parseInt(hi, 16), parseInt(lo, 16)),
      )
      .replace(
        /\\u([0-9a-fA-F]{4})/g,
        (_m, hex) => String.fromCharCode(parseInt(hex, 16)),
      ) as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => decodeUnicodeEscapes(v)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = decodeUnicodeEscapes(v);
    }
    return out as T;
  }
  return value;
}

// ---------------------------------------------------------------------------
// URL parsing — espejo de src/lib/parseVideoUrl.ts (con TT /photo/)
// ---------------------------------------------------------------------------

type Platform = "instagram" | "tiktok";

interface ParsedCarouselUrl {
  platform: Platform;
  short_code: string | null;
  normalized_url: string;
}

function parseCarouselUrl(input: string): ParsedCarouselUrl | null {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, "");

  if (host === "instagram.com" || host.endsWith(".instagram.com")) {
    // Carruseles IG viven en /p/CODE/ (también /reel/ pero esos son video — lo
    // detectamos después en el scrape).
    const m = u.pathname.match(/^\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
    if (!m) return null;
    return {
      platform: "instagram",
      short_code: m[2],
      normalized_url: `https://www.instagram.com/p/${m[2]}/`,
    };
  }

  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
    const full = u.pathname.match(/^\/@[^/]+\/(video|photo)\/(\d+)/);
    if (full) {
      return {
        platform: "tiktok",
        short_code: full[2],
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
// Helpers
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

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}
function parseDate(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

interface ScrapedSlide {
  index: number;
  cdn_url: string;
}

interface ScrapedCarousel {
  slides: ScrapedSlide[];
  caption: string | null;
  posted_at: string | null;
  short_code: string | null;
  source_url: string;
  raw: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Instagram scraping (carrousel = sidecar post con childPosts[] o images[])
// ---------------------------------------------------------------------------

async function scrapeInstagramCarousel(normalizedUrl: string): Promise<ScrapedCarousel> {
  if (!APIFY_TOKEN_INSTAGRAM) throw new Error("APIFY_API_KEY no configurado");
  const items = await callApify("apify~instagram-scraper", APIFY_TOKEN_INSTAGRAM, {
    directUrls: [normalizedUrl],
    resultsType: "posts",
    resultsLimit: 1,
    addParentData: false,
  });
  const raw = (items[0] ?? null) as Record<string, unknown> | null;
  if (!raw) throw new Error("Instagram: Apify devolvió 0 items");

  const type = str(raw.type) ?? str(raw.productType);
  // Recolectamos URLs de slides probando varias shapes que devuelve el actor.
  let slideUrls: string[] = [];
  const childPosts = raw.childPosts as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(childPosts) && childPosts.length > 0) {
    for (const child of childPosts) {
      const url = str(child.displayUrl) ?? str(child.url);
      if (url) slideUrls.push(url);
    }
  }
  if (slideUrls.length === 0) {
    const images = raw.images as string[] | undefined;
    if (Array.isArray(images) && images.length > 0) {
      slideUrls = images.filter((s): s is string => typeof s === "string" && s.length > 0);
    }
  }
  if (slideUrls.length === 0) {
    const sidecar = raw.sidecar as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(sidecar)) {
      for (const item of sidecar) {
        const url = str(item.displayUrl) ?? str(item.url);
        if (url) slideUrls.push(url);
      }
    }
  }

  if (slideUrls.length < 2) {
    throw new Error(
      type === "Video" || type === "Reel"
        ? "El link es un video, no un carrusel."
        : "El post no es un carrusel multi-slide. Pegá un link a un carrusel IG (varias imágenes).",
    );
  }

  const shortCode = str(raw.shortCode);
  const url = str(raw.url) ?? (shortCode ? `https://www.instagram.com/p/${shortCode}/` : normalizedUrl);

  return {
    slides: slideUrls.slice(0, MAX_SLIDES).map((cdn_url, index) => ({ index, cdn_url })),
    caption: str(raw.caption),
    posted_at: parseDate(raw.timestamp),
    short_code: shortCode,
    source_url: url,
    raw,
  };
}

// ---------------------------------------------------------------------------
// TikTok scraping (photo post = slideshow con images[])
// ---------------------------------------------------------------------------

async function scrapeTikTokCarousel(normalizedUrl: string): Promise<ScrapedCarousel> {
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

  // TT photo posts típicamente exponen images[] o slideshowImages[].
  let slideUrls: string[] = [];
  const images = raw.images as Array<Record<string, unknown> | string> | undefined;
  if (Array.isArray(images) && images.length > 0) {
    for (const img of images) {
      if (typeof img === "string") {
        slideUrls.push(img);
      } else if (img && typeof img === "object") {
        const u = str(img.imageUrl) ?? str(img.url) ?? str(img.downloadAddr);
        if (u) slideUrls.push(u);
      }
    }
  }
  if (slideUrls.length === 0) {
    const slides = raw.slideshowImages as string[] | undefined;
    if (Array.isArray(slides)) {
      slideUrls = slides.filter((s): s is string => typeof s === "string" && s.length > 0);
    }
  }

  if (slideUrls.length < 2) {
    throw new Error("El link no es un photo post de TikTok (slideshow). Probá con un carrusel IG.");
  }

  const id = str(raw.id);
  const url = str(raw.webVideoUrl) ?? normalizedUrl;

  return {
    slides: slideUrls.slice(0, MAX_SLIDES).map((cdn_url, index) => ({ index, cdn_url })),
    caption: str(raw.text),
    posted_at: parseDate(raw.createTimeISO),
    short_code: id,
    source_url: url,
    raw,
  };
}

// ---------------------------------------------------------------------------
// Slide download + upload to bucket
// ---------------------------------------------------------------------------

interface PersistedSlide {
  index: number;
  storage_path: string;
  mime: string;
  bytes: Uint8Array;
}

async function downloadAndUploadSlide(
  service: SupabaseClient,
  ownerId: string,
  referenceId: string,
  slide: ScrapedSlide,
): Promise<PersistedSlide> {
  const res = await fetch(slide.cdn_url);
  if (!res.ok) {
    throw new Error(`Download slide ${slide.index} ${res.status}`);
  }
  const mime = res.headers.get("content-type") ?? "image/jpeg";
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  const buf = new Uint8Array(await res.arrayBuffer());
  const path = `${ownerId}/${referenceId}/${slide.index}.${ext}`;
  const { error } = await service.storage
    .from(SLIDES_BUCKET)
    .upload(path, buf, { contentType: mime, upsert: true });
  if (error) {
    throw new Error(`Upload slide ${slide.index}: ${error.message}`);
  }
  return { index: slide.index, storage_path: path, mime, bytes: buf };
}

// ---------------------------------------------------------------------------
// Claude vision analysis
// ---------------------------------------------------------------------------

interface SlideAnalysis {
  index: number;
  extracted_text: string;
  visual_description: string;
}

interface CarouselAnalysis {
  concept: string;
  slides: SlideAnalysis[];
}

const ANALYSIS_TOOL = {
  name: "emit_carousel_analysis",
  description:
    "Analizá un carrusel multi-slide y devolvé el concepto sintetizado + breakdown por slide.",
  input_schema: {
    type: "object",
    properties: {
      concept: {
        type: "string",
        description:
          "100-250 palabras en español rioplatense que sinteticen la IDEA CENTRAL del carrusel: hook, tema, ángulo y arco narrativo. Sin filler, denso, sin AI-tells.",
      },
      slides: {
        type: "array",
        description: "Una entrada por slide, en orden. Misma cantidad que las imágenes recibidas.",
        items: {
          type: "object",
          properties: {
            index: { type: "integer", minimum: 0 },
            extracted_text: {
              type: "string",
              description:
                "TODO el texto literal visible en la slide, incluyendo headlines, bullets, captions y subtítulos. Si la slide no tiene texto, decir '(sin texto)'.",
            },
            visual_description: {
              type: "string",
              description:
                "1-3 oraciones describiendo la composición visual: layout, colores, jerarquía tipográfica, recursos gráficos. Útil para que un humano entienda qué se ve sin abrir el link.",
            },
          },
          required: ["index", "extracted_text", "visual_description"],
        },
      },
    },
    required: ["concept", "slides"],
  },
} as const;

const ANALYSIS_SYSTEM = `Sos un analista de carruseles cortos. Te paso N imágenes en orden (slide 0, 1, 2...) y la caption original del post.

Tu tarea: extraer texto literal de cada slide + describir su composición visual + sintetizar el concepto general del carrusel.

Reglas:
- Español rioplatense, denso, sin filler.
- El "concept" tiene 100-250 palabras. Mencioná hook, tema, ángulo, arco narrativo.
- "extracted_text" = transcripción literal de TODO el texto visible (headlines, bullets, números, etc.). Si no hay texto, decir '(sin texto)'.
- "visual_description" = 1-3 oraciones sobre composición/colores/jerarquía. NO repitas el texto.
- Nunca digas "imaginate", "te voy a explicar", "spoiler:", "esto lo cambia todo".
- Devolvé exactamente UNA invocación de la tool emit_carousel_analysis, con la misma cantidad de entries en slides[] que imágenes recibidas.`;

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    bin += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunkSize)) as unknown as number[],
    );
  }
  return btoa(bin);
}

function mimeToMediaType(mime: string): string {
  if (mime.includes("png")) return "image/png";
  if (mime.includes("webp")) return "image/webp";
  if (mime.includes("gif")) return "image/gif";
  return "image/jpeg";
}

async function analyzeWithClaude(
  slides: PersistedSlide[],
  caption: string | null,
): Promise<CarouselAnalysis> {
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY no configurado");

  const userContent: Array<Record<string, unknown>> = [];
  for (const slide of slides) {
    userContent.push({
      type: "text",
      text: `Slide ${slide.index}:`,
    });
    userContent.push({
      type: "image",
      source: {
        type: "base64",
        media_type: mimeToMediaType(slide.mime),
        data: bytesToBase64(slide.bytes),
      },
    });
  }
  userContent.push({
    type: "text",
    text: [
      "",
      `Caption original del post: ${caption ?? "(sin caption)"}`,
      `Total de slides: ${slides.length}`,
      "",
      "Devolvé el análisis llamando a emit_carousel_analysis con concept + slides[] (mismo orden, índices 0..N-1).",
    ].join("\n"),
  });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: ANALYSIS_SYSTEM,
      tools: [ANALYSIS_TOOL],
      tool_choice: { type: "tool", name: "emit_carousel_analysis" },
      messages: [{ role: "user", content: userContent }],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Claude ${res.status}: ${t.slice(0, 500)}`);
  }
  const data = (await res.json()) as {
    content: Array<{ type: string; name?: string; input?: CarouselAnalysis }>;
  };
  const toolUse = data.content.find(
    (b) => b.type === "tool_use" && b.name === "emit_carousel_analysis",
  );
  if (!toolUse?.input) throw new Error("Claude no emitió emit_carousel_analysis");
  return decodeUnicodeEscapes(toolUse.input);
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

interface CarouselReferenceRow {
  id: string;
  owner_id: string;
  source_url: string;
  normalized_url: string;
  platform: Platform;
  apify_short_code: string | null;
  caption: string | null;
  posted_at: string | null;
  slide_count: number | null;
  concept: string | null;
  slides: unknown;
  scrape_status: "pending" | "processing" | "done" | "failed";
  scrape_error: string | null;
  analysis_status: "pending" | "processing" | "done" | "failed";
  analysis_error: string | null;
  raw: Record<string, unknown> | null;
  last_scraped_at: string | null;
  last_analyzed_at: string | null;
  created_at: string;
  updated_at: string;
}

async function setScrapeStatus(
  client: SupabaseClient,
  id: string,
  status: "processing" | "done" | "failed",
  error: string | null = null,
) {
  await client
    .from("carousel_references")
    .update({
      scrape_status: status,
      scrape_error: error?.slice(0, 500) ?? null,
    })
    .eq("id", id);
}

async function setAnalysisStatus(
  client: SupabaseClient,
  id: string,
  status: "processing" | "done" | "failed",
  error: string | null = null,
) {
  await client
    .from("carousel_references")
    .update({
      analysis_status: status,
      analysis_error: error?.slice(0, 500) ?? null,
    })
    .eq("id", id);
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

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

    const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (roleErr || !isAdmin) return json({ error: "admin role required" }, 403);

    // Service-role para escribir el bucket (bypassea RLS de storage).
    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const url = typeof body?.url === "string" ? body.url.trim() : "";
    const force = !!body?.force;
    if (!url) return json({ error: "url is required" }, 400);

    const parsed = parseCarouselUrl(url);
    if (!parsed) {
      return json({ error: "URL no reconocida (IG /p/ o TT /photo/)" }, 400);
    }

    // Idempotencia: si ya está done en ambos pasos y no es force, devolvemos cached.
    const { data: existing } = await userClient
      .from("carousel_references")
      .select("*")
      .eq("owner_id", user.id)
      .eq("normalized_url", parsed.normalized_url)
      .maybeSingle();

    if (
      existing &&
      existing.scrape_status === "done" &&
      existing.analysis_status === "done" &&
      !force
    ) {
      return json({ reference: existing as CarouselReferenceRow, cached: true });
    }

    const baseRow = {
      owner_id: user.id,
      source_url: existing?.source_url ?? url,
      normalized_url: parsed.normalized_url,
      platform: parsed.platform,
      apify_short_code: existing?.apify_short_code ?? parsed.short_code ?? null,
      scrape_status: "processing" as const,
      scrape_error: null,
      analysis_status: "pending" as const,
      analysis_error: null,
    };
    const { data: row, error: upErr } = await userClient
      .from("carousel_references")
      .upsert(baseRow, { onConflict: "owner_id,normalized_url" })
      .select("*")
      .single();
    if (upErr || !row) {
      return json({ error: upErr?.message ?? "upsert failed" }, 500);
    }
    referenceId = row.id;

    // 1. Scrape Apify
    let scraped: ScrapedCarousel;
    try {
      if (parsed.platform === "instagram") {
        scraped = await scrapeInstagramCarousel(parsed.normalized_url);
      } else {
        scraped = await scrapeTikTokCarousel(parsed.normalized_url);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await setScrapeStatus(userClient, row.id, "failed", msg);
      return json({ error: msg, reference_id: row.id }, 502);
    }

    // 2. Download + upload slides
    let persisted: PersistedSlide[];
    try {
      persisted = await Promise.all(
        scraped.slides.map((s) =>
          downloadAndUploadSlide(service, user.id, row.id, s),
        ),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await setScrapeStatus(userClient, row.id, "failed", msg);
      return json({ error: msg, reference_id: row.id }, 502);
    }

    // Stamp metadata + scrape_status='done'
    await userClient
      .from("carousel_references")
      .update({
        source_url: scraped.source_url,
        apify_short_code: scraped.short_code,
        caption: scraped.caption,
        posted_at: scraped.posted_at,
        slide_count: scraped.slides.length,
        slides: persisted.map((s) => ({
          index: s.index,
          storage_path: s.storage_path,
          extracted_text: null,
          visual_description: null,
        })),
        raw: scraped.raw,
        scrape_status: "done",
        scrape_error: null,
        analysis_status: "processing",
        analysis_error: null,
        last_scraped_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    // 3. Vision analysis
    let analysis: CarouselAnalysis;
    try {
      analysis = await analyzeWithClaude(persisted, scraped.caption);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await setAnalysisStatus(userClient, row.id, "failed", msg);
      return json({ error: msg, reference_id: row.id }, 502);
    }

    // Mergear analysis con storage paths.
    const slidesById = new Map(persisted.map((s) => [s.index, s]));
    const mergedSlides = analysis.slides
      .map((a) => {
        const persistedSlide = slidesById.get(a.index);
        return {
          index: a.index,
          storage_path: persistedSlide?.storage_path ?? null,
          extracted_text: a.extracted_text,
          visual_description: a.visual_description,
        };
      })
      .sort((a, b) => a.index - b.index);

    // 4. Persist done
    const { data: done, error: doneErr } = await userClient
      .from("carousel_references")
      .update({
        concept: analysis.concept,
        slides: mergedSlides,
        analysis_status: "done",
        analysis_error: null,
        last_analyzed_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .select("*")
      .single();
    if (doneErr || !done) {
      await setAnalysisStatus(userClient, row.id, "failed", doneErr?.message ?? "update failed");
      return json({ error: doneErr?.message ?? "update failed", reference_id: row.id }, 500);
    }

    return json({ reference: done as CarouselReferenceRow, cached: false });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (referenceId && userClient) {
      try {
        await userClient
          .from("carousel_references")
          .update({
            scrape_status: "failed",
            scrape_error: msg.slice(0, 500),
            analysis_status: "failed",
            analysis_error: msg.slice(0, 500),
          })
          .eq("id", referenceId);
      } catch (_e) {
        // ignore
      }
    }
    return json({ error: msg }, 500);
  }
});
