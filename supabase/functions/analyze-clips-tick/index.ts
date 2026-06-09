// analyze-clips-tick: cron-invoked worker for the clips → reel-proposals flow.
//
// Clips are scheduled_posts marked is_clip=true (published only to TikTok +
// YouTube Shorts via the batch flow). `maturity_days` after a clip publishes,
// this worker — dispatched by pg_cron via dispatch_clip_analysis_tick() — refreshes
// its metrics (Apify via scrape-video), compares them against the owner's clip
// baseline, and if they clear the owner-configured threshold, creates a
// reel_proposals row proposing the clip for an Instagram Reel.
//
// Thresholds are per-owner and configurable from Settings (clip_analysis_settings),
// with hardcoded defaults when no row exists.
//
// Auth: verify_jwt:true → gateway validates the JWT. We require service-role.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Clips processed per tick. Each does up to 2 Apify scrapes (TT + YT) in
// parallel, so we keep this small to stay under the function timeout. The cron
// runs every 10 min, which is plenty for typical clip volume.
const CLIP_LIMIT = 2;
// A clip claimed (idle → analyzing) whose updated_at is older than this is
// treated as abandoned by a crashed tick and re-picked.
const STALE_ANALYZING_MS = 10 * 60 * 1000;
// Baseline cohort window.
const BASELINE_DAYS = 90;

const DEFAULTS = {
  enabled: true,
  maturity_days: 10,
  relative_multiplier: 1.5,
  min_history_clips: 5,
  absolute_min_views: 5000,
};

interface ClipSettings {
  enabled: boolean;
  maturity_days: number;
  relative_multiplier: number;
  min_history_clips: number;
  absolute_min_views: number;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function getJwtRole(authHeader: string): string | null {
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "===".slice((b64.length + 3) % 4);
    const payload = JSON.parse(atob(padded));
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

function isServiceRoleCaller(req: Request, serviceKey: string): boolean {
  const auth = req.headers.get("Authorization") ?? "";
  const apiKey = req.headers.get("apikey") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
  if (token && token === serviceKey) return true;
  if (apiKey && apiKey === serviceKey) return true;
  if (getJwtRole(auth) === "service_role") return true;
  return false;
}

type Platform = "instagram" | "youtube" | "tiktok";

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

async function loadSettings(admin: SupabaseClient, ownerId: string): Promise<ClipSettings> {
  const { data } = await admin
    .from("clip_analysis_settings")
    .select("enabled, maturity_days, relative_multiplier, min_history_clips, absolute_min_views")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (!data) return { ...DEFAULTS };
  return {
    enabled: data.enabled ?? DEFAULTS.enabled,
    maturity_days: data.maturity_days ?? DEFAULTS.maturity_days,
    relative_multiplier: Number(data.relative_multiplier ?? DEFAULTS.relative_multiplier),
    min_history_clips: data.min_history_clips ?? DEFAULTS.min_history_clips,
    absolute_min_views: data.absolute_min_views ?? DEFAULTS.absolute_min_views,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST" && req.method !== "GET") return json(405, { error: "method" });

  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    if (!isServiceRoleCaller(req, serviceKey)) {
      return json(401, { error: "service_role_only" });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Candidate clips: published ≥1 day ago (cheap prefilter; per-owner maturity
    // checked in JS), still idle, plus abandoned 'analyzing' rows.
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const staleBefore = new Date(Date.now() - STALE_ANALYZING_MS).toISOString();
    const [idleRes, staleRes] = await Promise.all([
      admin
        .from("scheduled_posts")
        .select("id, owner_id, batch_id, title, caption_default, hashtags, thumbnail_url, bunny_video_id, bunny_library_id, published_at, updated_at")
        .eq("is_clip", true)
        .in("status", ["published", "partial"])
        .eq("clip_analysis_status", "idle")
        .not("published_at", "is", null)
        .lte("published_at", dayAgo)
        .order("published_at", { ascending: true })
        .limit(20),
      admin
        .from("scheduled_posts")
        .select("id, owner_id, batch_id, title, caption_default, hashtags, thumbnail_url, bunny_video_id, bunny_library_id, published_at, updated_at")
        .eq("is_clip", true)
        .eq("clip_analysis_status", "analyzing")
        .lt("updated_at", staleBefore)
        .limit(5),
    ]);
    if (idleRes.error) return json(500, { error: idleRes.error.message });
    if (staleRes.error) return json(500, { error: staleRes.error.message });

    const candidates = [...(idleRes.data ?? []), ...(staleRes.data ?? [])];

    const settingsCache = new Map<string, ClipSettings>();
    let processed = 0;
    let proposed = 0;
    let skipped = 0;

    for (const clip of candidates) {
      if (processed >= CLIP_LIMIT) break;

      // Per-owner settings (cached).
      let settings = settingsCache.get(clip.owner_id);
      if (!settings) {
        settings = await loadSettings(admin, clip.owner_id);
        settingsCache.set(clip.owner_id, settings);
      }
      if (!settings.enabled) continue;

      // Maturity check.
      const publishedMs = clip.published_at ? Date.parse(clip.published_at) : NaN;
      if (!Number.isFinite(publishedMs)) continue;
      const matureAt = publishedMs + settings.maturity_days * 24 * 60 * 60 * 1000;
      if (Date.now() < matureAt) continue;

      // Atomically claim → analyzing (optimistic lock on updated_at).
      const { data: claimed } = await admin
        .from("scheduled_posts")
        .update({ clip_analysis_status: "analyzing" })
        .eq("id", clip.id)
        .eq("updated_at", clip.updated_at)
        .select("id")
        .maybeSingle();
      if (!claimed) continue;
      processed++;

      // Succeeded jobs with a linked video_post.
      const { data: jobs } = await admin
        .from("publish_jobs")
        .select("platform, video_post_id")
        .eq("scheduled_post_id", clip.id)
        .eq("status", "succeeded")
        .not("video_post_id", "is", null);

      const postIds = (jobs ?? [])
        .map((j) => j.video_post_id as string)
        .filter((id): id is string => !!id);

      if (postIds.length === 0) {
        await admin
          .from("scheduled_posts")
          .update({ clip_analysis_status: "skipped" })
          .eq("id", clip.id);
        skipped++;
        continue;
      }

      // Refresh metrics via scrape-video (service-role) for each post, in parallel.
      await Promise.all(
        postIds.map((id) =>
          fetch(`${supabaseUrl}/functions/v1/scrape-video`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
              apikey: serviceKey,
            },
            body: JSON.stringify({ video_post_id: id }),
          }).catch((e) => {
            console.warn("scrape_failed", id, e instanceof Error ? e.message : String(e));
          }),
        ),
      );

      // Read fresh metrics.
      const { data: posts } = await admin
        .from("video_posts")
        .select("platform, views_total, likes, comments, shares, saves")
        .in("id", postIds);

      const byPlatform: Record<string, { views: number; likes: number; comments: number; shares: number; saves: number }> = {};
      let totalViews = 0;
      let totalEng = 0;
      for (const p of posts ?? []) {
        const plat = p.platform as Platform;
        const views = Number(p.views_total ?? 0);
        const likes = Number(p.likes ?? 0);
        const comments = Number(p.comments ?? 0);
        const shares = Number(p.shares ?? 0);
        const saves = Number(p.saves ?? 0);
        byPlatform[plat] = { views, likes, comments, shares, saves };
        totalViews += views;
        totalEng += likes + comments + shares + saves;
      }

      // Baseline: median clip_total_views of this owner's other already-analyzed
      // clips published in the last BASELINE_DAYS.
      const baselineSince = new Date(Date.now() - BASELINE_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const { data: history } = await admin
        .from("scheduled_posts")
        .select("clip_total_views")
        .eq("owner_id", clip.owner_id)
        .eq("is_clip", true)
        .eq("clip_analysis_status", "done")
        .not("clip_total_views", "is", null)
        .gte("published_at", baselineSince)
        .neq("id", clip.id);
      const historyViews = (history ?? [])
        .map((h) => Number(h.clip_total_views))
        .filter((v) => Number.isFinite(v));
      const baselineMedian = median(historyViews);
      const useRelative = historyViews.length >= settings.min_history_clips && baselineMedian > 0;

      const qualifies = useRelative
        ? totalViews >= baselineMedian * settings.relative_multiplier
        : totalViews >= settings.absolute_min_views;

      // Mark analyzed regardless, stamping the views snapshot for future baselines.
      await admin
        .from("scheduled_posts")
        .update({ clip_analysis_status: "done", clip_total_views: totalViews })
        .eq("id", clip.id);

      if (!qualifies) continue;

      // Build justification + metrics snapshot.
      const tt = byPlatform["tiktok"]?.views ?? 0;
      const yt = byPlatform["youtube"]?.views ?? 0;
      const engRate = totalViews > 0 ? ((totalEng / totalViews) * 100).toFixed(1) : "0";
      let justification: string;
      if (useRelative) {
        const mult = (totalViews / baselineMedian).toFixed(1);
        justification =
          `${fmtNum(tt)} views en TikTok + ${fmtNum(yt)} en YouTube Shorts en ${settings.maturity_days} días — ` +
          `${mult}× la mediana de tus clips. Engagement ${engRate}%.`;
      } else {
        justification =
          `${fmtNum(totalViews)} views (TikTok + YouTube Shorts) en ${settings.maturity_days} días. ` +
          `Supera tu umbral de ${fmtNum(settings.absolute_min_views)} views. Engagement ${engRate}%.`;
      }

      const { data: proposal, error: insErr } = await admin
        .from("reel_proposals")
        .insert({
          owner_id: clip.owner_id,
          scheduled_post_id: clip.id,
          batch_id: clip.batch_id,
          bunny_video_id: clip.bunny_video_id,
          bunny_library_id: clip.bunny_library_id,
          title: clip.title,
          caption_snapshot: clip.caption_default,
          hashtags: clip.hashtags ?? [],
          thumbnail_url: clip.thumbnail_url,
          metrics: {
            by_platform: byPlatform,
            total_views: totalViews,
            total_engagement: totalEng,
            engagement_rate: Number(engRate),
          },
          clip_total_views: totalViews,
          baseline_median: useRelative ? baselineMedian : null,
          score: totalViews,
          justification,
          status: "pending",
        })
        .select("id")
        .maybeSingle();

      if (insErr) {
        // Unique violation = proposal already exists for this clip; ignore.
        if (!insErr.message.includes("duplicate") && !insErr.message.includes("unique")) {
          console.warn("proposal_insert_failed", clip.id, insErr.message);
        }
        continue;
      }
      proposed++;

      // Notify owner (in-app + push, deduped per clip).
      try {
        await admin.from("notifications").insert({
          user_id: clip.owner_id,
          kind: "reels.proposal",
          title: "Nueva propuesta de Reel",
          body: justification.slice(0, 160),
          link: "/app/admin/publishing/reels",
          dedupe_key: `reels:proposal:${clip.id}`,
        });
        await fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
          body: JSON.stringify({
            user_id: clip.owner_id,
            title: "Nueva propuesta de Reel",
            body: "Un clip performó bien — ¿lo subimos a Instagram?",
            url: "/app/admin/publishing/reels",
          }),
        }).catch(() => {});
      } catch (e) {
        console.warn("notify_failed", e);
      }
    }

    return json(200, { ok: true, scanned: candidates.length, processed, proposed, skipped });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : "unknown" });
  }
});
