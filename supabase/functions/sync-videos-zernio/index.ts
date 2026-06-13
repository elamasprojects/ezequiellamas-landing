// sync-videos-zernio: native video sync via Zernio's analytics API (replaces the
// slow/costly Apify discovery). Pulls EVERY video on the creator's connected
// accounts — including content posted natively, outside the app — through each
// platform's official API, and feeds the videos/video_posts model that powers
// /app/admin/videos.
//
// Why this fixes the fragmentation bug: Zernio returns one row per (post ×
// platform) and links the cross-posted versions with `latePostId`. Grouping by
// `latePostId` merges IG+YT+TT of the same upload into ONE logical video — no
// fuzzy matching. Existing rows are reconciled in place (matched by
// platform+shortcode) and fragmented duplicates are consolidated.
//
// The multiplier needs nothing here: writing video_posts.views_total fires the
// existing `video_posts_calc_multiplier` trigger, which recomputes
// videos.views_total_aggregate / multiplier / performance_tier.
//
// Auth: verify_jwt:true gateway + service-role (cron) OR admin JWT (button) —
// same gate as zernio-analytics-sync.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const ZERNIO_BASE = "https://zernio.com/api/v1";
const BUCKET = "video-thumbnails";
const SYNCABLE = ["instagram", "youtube", "tiktok"] as const;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

// ── auth helpers (mirrors zernio-analytics-sync) ────────────────────────────
function decodeJwt(authHeader: string): Record<string, unknown> | null {
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "===".slice((b64.length + 3) % 4);
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}
function isServiceRoleCaller(req: Request, serviceKey: string): boolean {
  const auth = req.headers.get("Authorization") ?? "";
  const apiKey = req.headers.get("apikey") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
  return token === serviceKey || apiKey === serviceKey || decodeJwt(auth)?.role === "service_role";
}

// ── defensive pickers ───────────────────────────────────────────────────────
function num(...vals: unknown[]): number | null {
  for (const v of vals) {
    const n = typeof v === "string" ? Number(v) : (v as number);
    if (typeof n === "number" && Number.isFinite(n)) return n;
  }
  return null;
}
function int(...vals: unknown[]): number | null {
  const n = num(...vals);
  return n == null ? null : Math.round(n);
}
function str(...vals: unknown[]): string | null {
  for (const v of vals) if (typeof v === "string" && v.length) return v;
  return null;
}
function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
function parseDate(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}
function firstLine(s: string | null): string | null {
  if (!s) return null;
  const line = s.split("\n").map((x) => x.trim()).find((x) => x.length) ?? null;
  return line ? line.slice(0, 200) : null;
}

// ── fuzzy clustering of natively-posted videos (no Zernio latePostId) ─────────
// Zernio groups app-published cross-posts via latePostId. Content posted
// directly on each platform has no such key, so we cluster it ourselves: a
// single creator cross-posts the same video within minutes, so post-time
// proximity is the strong signal; a caption "hook" (first significant tokens,
// which platform variants share) guards against merging unrelated close posts.
const TIGHT_WINDOW_MS = 20 * 60 * 1000; // ±20min → near-simultaneous cross-post
const WIDE_WINDOW_MS = 12 * 60 * 60 * 1000; // same hook spread across a day
const TIGHT_HOOK_MIN = 0.15;
const WIDE_HOOK_MIN = 0.55;
const NULLTIME_HOOK_MIN = 0.8;
const HOOK_TOKENS = 8;
const STOPWORDS = new Set([
  "el", "la", "los", "las", "de", "del", "y", "o", "a", "en", "un", "una", "unos", "unas", "es", "son", "que", "con",
  "por", "para", "mi", "tu", "su", "sus", "mis", "tus", "mas", "más", "menos", "si", "no", "ya", "ser", "estar", "fue",
  "muy", "todo", "todos", "toda", "todas", "the", "an", "of", "and", "or", "to", "in", "on", "for", "with", "my", "your",
  "are", "was", "were", "be", "been", "this", "that", "these", "those", "but", "if", "very", "all", "so", "just",
]);

function tokens(text: string | null): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[@#]\w+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}
function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const sa = new Set(a), sb = new Set(b);
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

interface Cluster {
  platforms: Set<string>;
  hook: string[];
  time: number | null;
  entries: Entry[];
}
// Greedy single-pass clustering, seeded earliest-first.
function clusterNative(entries: Entry[]): Entry[][] {
  const sorted = [...entries].sort((a, b) => (a.postedAt ?? "").localeCompare(b.postedAt ?? ""));
  const clusters: Cluster[] = [];
  for (const e of sorted) {
    const eh = tokens(e.caption).slice(0, HOOK_TOKENS);
    const et = e.postedAt ? Date.parse(e.postedAt) : null;
    let placed = false;
    for (const c of clusters) {
      if (c.platforms.has(e.platform)) continue;
      const hs = jaccard(eh, c.hook);
      let match: boolean;
      if (et != null && c.time != null) {
        const gap = Math.abs(et - c.time);
        match = (gap <= TIGHT_WINDOW_MS && hs >= TIGHT_HOOK_MIN) || (gap <= WIDE_WINDOW_MS && hs >= WIDE_HOOK_MIN);
      } else {
        match = hs >= NULLTIME_HOOK_MIN;
      }
      if (match) {
        c.entries.push(e);
        c.platforms.add(e.platform);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push({ platforms: new Set([e.platform]), hook: eh, time: et, entries: [e] });
  }
  return clusters.map((c) => c.entries);
}

async function zernioGet(apiKey: string, path: string): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  const r = await fetch(`${ZERNIO_BASE}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  });
  let body: Record<string, unknown> = {};
  try {
    body = (await r.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  return { ok: r.ok, status: r.status, body };
}

interface AccountMatch {
  owner_id: string;
  platform: string;
}

// Build map: zernio account id (and external_account_id) -> our owner/platform.
async function buildAccountMap(admin: SupabaseClient): Promise<Map<string, AccountMatch>> {
  const { data } = await admin.from("social_accounts").select("owner_id, platform, external_account_id, meta");
  const map = new Map<string, AccountMatch>();
  for (const row of data ?? []) {
    const match: AccountMatch = { owner_id: row.owner_id as string, platform: row.platform as string };
    const ext = row.external_account_id as string | null;
    const zid = (row.meta as Record<string, unknown> | null)?.zernio_account_id as string | undefined;
    if (ext) map.set(ext, match);
    if (zid) map.set(zid, match);
  }
  return map;
}

// Embeddable short code (used by VideoEmbed.tsx). IG must come from the URL
// (its platformPostId is a numeric media id that does NOT embed); YT/TT use the
// platform post id (the video id), falling back to the URL.
function extractShortcode(platform: string, url: string, platformPostId: string | null): string | null {
  if (platform === "instagram") {
    const m = url.match(/\/(?:reel|reels|p|tv)\/([^/?#]+)/i);
    return m ? m[1] : null;
  }
  if (platform === "youtube") {
    if (platformPostId) return platformPostId;
    const m = url.match(/(?:v=|youtu\.be\/|\/shorts\/|\/embed\/)([^/?#&]+)/i);
    return m ? m[1] : null;
  }
  if (platform === "tiktok") {
    if (platformPostId && /^\d+$/.test(platformPostId)) return platformPostId;
    const m = url.match(/\/video\/(\d+)/);
    return m ? m[1] : platformPostId;
  }
  return platformPostId;
}

function canonicalUrl(platform: string, shortcode: string, rawUrl: string): string {
  if (platform === "instagram") return `https://www.instagram.com/reel/${shortcode}/`;
  if (platform === "youtube") return `https://www.youtube.com/watch?v=${shortcode}`;
  if (platform === "tiktok") {
    const q = rawUrl.indexOf("?");
    return q >= 0 ? rawUrl.slice(0, q) : rawUrl;
  }
  return rawUrl;
}

interface Entry {
  ownerId: string;
  platform: string;
  groupKey: string;
  isLateGroup: boolean; // true when groupKey is a real Zernio latePostId
  shortcode: string;
  platformPostId: string | null;
  sourceUrl: string;
  caption: string | null;
  postedAt: string | null;
  thumbUrl: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  reach: number | null;
  raw: Record<string, unknown>;
}

function normalize(p: Record<string, unknown>, accountMap: Map<string, AccountMatch>): Entry | null {
  const mediaType = str(p.mediaType);
  if (mediaType && mediaType !== "video") return null; // section is for videos
  const pe = (asArray(p.platforms)[0] ?? {}) as Record<string, unknown>;
  const platform = str(p.platform, pe.platform);
  if (!platform || !(SYNCABLE as ReadonlyArray<string>).includes(platform)) return null;

  const accId = str(pe.accountId, pe.account_id, p.accountId);
  const match = accId ? accountMap.get(accId) : undefined;
  if (!match?.owner_id) return null;

  const url = str(p.platformPostUrl, pe.platformPostUrl, pe.platform_post_url);
  if (!url) return null;
  const platformPostId = str(pe.platformPostId, pe.platform_post_id, p.platformPostId);
  const shortcode = extractShortcode(platform, url, platformPostId);
  if (!shortcode) return null;

  const latePostId = str(p.latePostId);
  const selfId = str(p._id, p.id) ?? `${platform}:${platformPostId ?? shortcode}`;
  const a = (p.analytics ?? pe.analytics ?? {}) as Record<string, unknown>;

  return {
    ownerId: match.owner_id,
    platform,
    groupKey: latePostId ?? `solo:${selfId}`,
    isLateGroup: !!latePostId,
    shortcode,
    platformPostId,
    sourceUrl: canonicalUrl(platform, shortcode, url),
    caption: str(p.content, p.caption, p.title),
    postedAt: parseDate(str(p.publishedAt, p.scheduledFor, p.createdAt)),
    thumbUrl: str(p.thumbnailUrl, pe.thumbnail, pe.thumbnailUrl),
    views: int(a.views),
    likes: int(a.likes),
    comments: int(a.comments),
    shares: int(a.shares),
    saves: int(a.saves),
    reach: int(a.reach),
    raw: p,
  };
}

async function uploadThumbnailToBucket(
  service: SupabaseClient,
  ownerId: string,
  videoPostId: string,
  cdnUrl: string,
): Promise<{ publicUrl: string; storagePath: string } | null> {
  try {
    const res = await fetch(cdnUrl);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const blob = await res.blob();
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const path = `${ownerId}/${videoPostId}.${ext}`;
    const { error } = await service.storage.from(BUCKET).upload(path, blob, { contentType, upsert: true });
    if (error) return null;
    const { data: pub } = service.storage.from(BUCKET).getPublicUrl(path);
    return { publicUrl: pub.publicUrl, storagePath: path };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST" && req.method !== "GET") return json(405, { error: "method" });

  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const zernioKey = Deno.env.get("ZERNIO_API_KEY");
    if (!zernioKey) return json(500, { error: "ZERNIO_API_KEY not set" });

    const admin = createClient(supabaseUrl, serviceKey);

    // Cron calls with service role; a manual "Sincronizar" comes with a user JWT —
    // gate it to admins (the sync writes every owner's data / burns Zernio quota).
    if (!isServiceRoleCaller(req, serviceKey)) {
      const sub = decodeJwt(req.headers.get("Authorization") ?? "")?.sub as string | undefined;
      if (!sub) return json(401, { error: "unauthorized" });
      const { data: adminRow } = await admin
        .from("user_roles").select("role").eq("user_id", sub).eq("role", "admin").maybeSingle();
      if (!adminRow) return json(403, { error: "admin_only" });
    }

    const accountMap = await buildAccountMap(admin);
    const result = { imported: 0, merged: 0, synced: 0, videos: 0, discovered: 0, errors: [] as string[] };

    // ── 1) Pull every (post × platform) from Zernio analytics (paginated) ──────
    const entries: Entry[] = [];
    let page = 1;
    let pages = 1;
    do {
      const r = await zernioGet(zernioKey, `/analytics?source=all&limit=50&page=${page}`);
      if (!r.ok) {
        result.errors.push(`analytics ${r.status}: ${str(r.body.error) ?? "failed"}`);
        break;
      }
      const posts = (asArray(r.body.posts).length ? asArray(r.body.posts) : asArray(r.body.data)) as Record<string, unknown>[];
      for (const p of posts) {
        result.discovered++;
        const e = normalize(p, accountMap);
        if (e) entries.push(e);
      }
      pages = int((r.body.pagination as Record<string, unknown> | undefined)?.pages) ?? 1;
      page++;
    } while (page <= pages && page <= 50);

    // ── 2) Process per owner so reconcile + multiplier baseline stay owner-scoped
    const byOwner = new Map<string, Entry[]>();
    for (const e of entries) {
      const arr = byOwner.get(e.ownerId) ?? [];
      arr.push(e);
      byOwner.set(e.ownerId, arr);
    }

    for (const [ownerId, ownerEntries] of byOwner) {
      // Existing videos + posts for this owner.
      const { data: ownerVideos } = await admin
        .from("videos").select("id, created_at, title, zernio_late_post_id").eq("owner_id", ownerId);
      const videoIds = (ownerVideos ?? []).map((v) => v.id as string);
      const { data: existingPosts } = videoIds.length
        ? await admin.from("video_posts").select("id, video_id, platform, apify_short_code").in("video_id", videoIds)
        : { data: [] as Record<string, unknown>[] };

      const byShortcode = new Map<string, string>(); // platform:shortcode -> video_id
      const postCount = new Map<string, number>(); // video_id -> #posts
      for (const p of existingPosts ?? []) {
        const vid = p.video_id as string;
        postCount.set(vid, (postCount.get(vid) ?? 0) + 1);
        const sc = p.apify_short_code as string | null;
        if (sc) byShortcode.set(`${p.platform}:${sc}`, vid);
      }
      const lateToVideo = new Map<string, string>(); // zernio_late_post_id -> video_id
      const createdAt = new Map<string, string>();
      const titleByVideo = new Map<string, string | null>();
      for (const v of ownerVideos ?? []) {
        if (v.zernio_late_post_id) lateToVideo.set(v.zernio_late_post_id as string, v.id as string);
        createdAt.set(v.id as string, (v.created_at as string) ?? "");
        titleByVideo.set(v.id as string, (v.title as string | null) ?? null);
      }

      // Group: app-published cross-posts by Zernio latePostId; everything else
      // (natively posted, no latePostId) clustered by time+caption hook.
      const lateGroups = new Map<string, Entry[]>();
      const natives: Entry[] = [];
      for (const e of ownerEntries) {
        if (e.isLateGroup) {
          const arr = lateGroups.get(e.groupKey) ?? [];
          arr.push(e);
          lateGroups.set(e.groupKey, arr);
        } else {
          natives.push(e);
        }
      }
      const allGroups: { key: string | null; isLate: boolean; entries: Entry[] }[] = [
        ...[...lateGroups.entries()].map(([key, entries]) => ({ key, isLate: true, entries })),
        ...clusterNative(natives).map((entries) => ({ key: null, isLate: false, entries })),
      ];

      for (const { key: groupKey, isLate, entries: groupEntries } of allGroups) {
        result.videos++;
        try {
          // Candidate existing videos: matched by shortcode, or already carrying this late id.
          const candidates = new Set<string>();
          for (const e of groupEntries) {
            const hit = byShortcode.get(`${e.platform}:${e.shortcode}`);
            if (hit) candidates.add(hit);
          }
          const lateHit = groupKey ? lateToVideo.get(groupKey) : undefined;
          if (lateHit) candidates.add(lateHit);

          let videoId: string;
          if (candidates.size > 0) {
            // Canonical = most posts, tie-break oldest created_at.
            videoId = [...candidates].sort((a, b) => {
              const d = (postCount.get(b) ?? 0) - (postCount.get(a) ?? 0);
              if (d !== 0) return d;
              return (createdAt.get(a) ?? "").localeCompare(createdAt.get(b) ?? "");
            })[0];
            // Reparent the fragments into the canonical video, then delete emptied videos.
            for (const other of candidates) {
              if (other === videoId) continue;
              await reparent(admin, other, videoId, postCount);
              result.merged++;
            }
          } else {
            const title = firstLine(groupEntries.find((e) => e.caption)?.caption ?? null);
            const { data: nv, error } = await admin
              .from("videos")
              .insert({ owner_id: ownerId, title, zernio_late_post_id: isLate ? groupKey : null })
              .select("id").single();
            if (error || !nv) throw new Error(`insert video: ${error?.message}`);
            videoId = nv.id as string;
            createdAt.set(videoId, new Date().toISOString());
            result.imported++;
          }

          // Stamp grouping + seed title if missing (only for real late groups).
          const patch: Record<string, unknown> = {};
          if (isLate && groupKey && !lateToVideo.has(groupKey)) patch.zernio_late_post_id = groupKey;
          if (!titleByVideo.get(videoId)) {
            const t = firstLine(groupEntries.find((e) => e.caption)?.caption ?? null);
            if (t) patch.title = t;
          }
          if (Object.keys(patch).length) await admin.from("videos").update(patch).eq("id", videoId);
          if (isLate && groupKey) lateToVideo.set(groupKey, videoId);

          // Upsert each platform post (fires the multiplier trigger via views_total).
          for (const e of groupEntries) {
            await upsertPost(admin, videoId, ownerId, e);
            byShortcode.set(`${e.platform}:${e.shortcode}`, videoId);
            result.synced++;
          }
        } catch (err) {
          const label = groupKey ?? `native:${groupEntries[0]?.shortcode ?? "?"}`;
          result.errors.push(`group ${label}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    const ok = result.errors.length === 0 || result.synced > 0;
    return json(200, { ok, ...result });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : "unknown" });
  }
});

// Move all of `fromId`'s posts onto `toId` (skipping platforms `toId` already has,
// deleting those duplicates), then delete `fromId` if it's left empty.
async function reparent(admin: SupabaseClient, fromId: string, toId: string, postCount: Map<string, number>): Promise<void> {
  const { data: toPosts } = await admin.from("video_posts").select("platform").eq("video_id", toId);
  const toPlatforms = new Set((toPosts ?? []).map((p) => p.platform as string));
  const { data: fromPosts } = await admin.from("video_posts").select("id, platform").eq("video_id", fromId);
  for (const p of fromPosts ?? []) {
    if (toPlatforms.has(p.platform as string)) {
      await admin.from("video_posts").delete().eq("id", p.id);
    } else {
      await admin.from("video_posts").update({ video_id: toId }).eq("id", p.id);
      toPlatforms.add(p.platform as string);
    }
  }
  const { count } = await admin.from("video_posts").select("id", { count: "exact", head: true }).eq("video_id", fromId);
  if ((count ?? 0) === 0) await admin.from("videos").delete().eq("id", fromId);
  postCount.set(toId, toPlatforms.size);
  postCount.delete(fromId);
}

async function upsertPost(admin: SupabaseClient, videoId: string, ownerId: string, e: Entry): Promise<void> {
  const now = new Date().toISOString();
  const row = {
    video_id: videoId,
    platform: e.platform,
    source_url: e.sourceUrl,
    apify_short_code: e.shortcode,
    platform_post_id: e.platformPostId,
    caption: e.caption,
    posted_at: e.postedAt,
    views_total: e.views,
    likes: e.likes,
    comments: e.comments,
    shares: e.shares,
    saves: e.saves,
    reach: e.reach,
    raw: e.raw,
    last_scraped_at: now,
    last_scrape_error: null,
    metrics_updated_at: now,
  };
  const { data: up, error } = await admin
    .from("video_posts")
    .upsert(row, { onConflict: "video_id,platform" })
    .select("id, thumbnail_storage_path")
    .single();
  if (error || !up) throw new Error(`upsert post (${e.platform}): ${error?.message}`);
  const postId = up.id as string;

  // Persist the thumbnail once — platform CDN URLs expire, so only fetch when we
  // don't already have a stored copy.
  if (e.thumbUrl && !up.thumbnail_storage_path) {
    const stored = await uploadThumbnailToBucket(admin, ownerId, postId, e.thumbUrl);
    await admin.from("video_posts").update(
      stored
        ? { thumbnail_url: stored.publicUrl, thumbnail_cdn_url: e.thumbUrl, thumbnail_storage_path: stored.storagePath }
        : { thumbnail_url: e.thumbUrl, thumbnail_cdn_url: e.thumbUrl },
    ).eq("id", postId);
  }

  await admin.from("video_metrics_history").insert({
    video_post_id: postId,
    views_total: e.views,
    likes: e.likes,
    comments: e.comments,
    shares: e.shares,
    saves: e.saves,
    raw: e.raw,
  });
}
