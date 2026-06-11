// zernio-analytics-sync: cron-invoked. Pulls native analytics for the creator's
// OWN connected accounts from the Zernio API and stores them for the dashboard:
//   - zernio_account_stats  (current followers + growth + content counts)
//   - zernio_account_daily  (follower time series for growth charts)
//   - zernio_post_analytics (per-post metrics)
//
// Apify is untouched (referents + TikTok per-video fallback). Defensive against
// Zernio response-shape variation and a missing Analytics add-on (402/403).
//
// Auth: verify_jwt:true gateway + service-role required (same as scheduler-tick).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const ZERNIO_BASE = "https://zernio.com/api/v1";

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

function getJwtRole(authHeader: string): string | null {
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "===".slice((b64.length + 3) % 4);
    return JSON.parse(atob(padded)).role ?? null;
  } catch {
    return null;
  }
}

function isServiceRoleCaller(req: Request, serviceKey: string): boolean {
  const auth = req.headers.get("Authorization") ?? "";
  const apiKey = req.headers.get("apikey") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
  return token === serviceKey || apiKey === serviceKey || getJwtRole(auth) === "service_role";
}

function getJwtSub(authHeader: string): string | null {
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "===".slice((b64.length + 3) % 4);
    return JSON.parse(atob(padded)).sub ?? null;
  } catch {
    return null;
  }
}

// Defensive numeric/string pickers.
function num(...vals: unknown[]): number | null {
  for (const v of vals) {
    const n = typeof v === "string" ? Number(v) : (v as number);
    if (typeof n === "number" && Number.isFinite(n)) return n;
  }
  return null;
}
// Like num() but rounds — for integer/bigint columns.
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
  social_account_id: string;
  owner_id: string;
  platform: string;
}

// Build map: zernio account id -> our social_accounts row.
async function buildAccountMap(admin: SupabaseClient): Promise<Map<string, AccountMatch>> {
  const { data } = await admin
    .from("social_accounts")
    .select("id, owner_id, platform, external_account_id, meta");
  const map = new Map<string, AccountMatch>();
  for (const row of data ?? []) {
    const match: AccountMatch = {
      social_account_id: row.id as string,
      owner_id: row.owner_id as string,
      platform: row.platform as string,
    };
    const ext = row.external_account_id as string | null;
    const zid = (row.meta as Record<string, unknown> | null)?.zernio_account_id as string | undefined;
    if (ext) map.set(ext, match);
    if (zid) map.set(zid, match);
  }
  return map;
}

function contentCount(accountStats: Record<string, unknown> | undefined): number | null {
  if (!accountStats) return null;
  return num(
    accountStats.mediaCount,
    accountStats.videoCount,
    accountStats.postsCount,
    accountStats.tweetCount,
    accountStats.pinCount,
  );
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

    // The cron calls with the service role. A manual refresh comes with a user
    // JWT — gate it to admins (the sync writes every owner's data, so a
    // non-admin must not be able to trigger it / burn Zernio quota).
    if (!isServiceRoleCaller(req, serviceKey)) {
      const sub = getJwtSub(req.headers.get("Authorization") ?? "");
      if (!sub) return json(401, { error: "unauthorized" });
      const { data: adminRow } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", sub)
        .eq("role", "admin")
        .maybeSingle();
      if (!adminRow) return json(403, { error: "admin_only" });
    }

    const accountMap = await buildAccountMap(admin);
    const result = { followers: 0, daily: 0, posts: 0, errors: [] as string[] };

    // ── 1) Follower stats (followers + growth + content counts + time series) ──
    const fs = await zernioGet(zernioKey, "/accounts/follower-stats?granularity=daily");
    if (!fs.ok) {
      result.errors.push(`follower-stats ${fs.status}: ${str(fs.body.error) ?? "failed"}`);
    } else {
      const accounts = asArray(fs.body.accounts) as Record<string, unknown>[];
      const statsMap = (fs.body.stats ?? {}) as Record<string, unknown>;
      for (const a of accounts) {
        const zid = str(a._id, a.id, a.accountId);
        if (!zid) continue;
        const match = accountMap.get(zid);
        if (!match) continue;
        const accountStats = a.accountStats as Record<string, unknown> | undefined;
        const { error: stErr } = await admin.from("zernio_account_stats").upsert(
          {
            social_account_id: match.social_account_id,
            owner_id: match.owner_id,
            platform: match.platform,
            username: str(a.username, a.handle),
            display_name: str(a.displayName, a.name),
            avatar_url: str(a.avatarUrl, a.avatar, a.profilePictureUrl),
            followers: int(a.currentFollowers, a.followers, a.followerCount),
            following: int(accountStats?.followingCount),
            growth: int(a.growth),
            growth_pct: num(a.growthPercentage, a.growthPct),
            content_count: contentCount(accountStats),
            views_total: int(accountStats?.totalViews, accountStats?.monthlyViews),
            likes_total: int(accountStats?.likesCount),
            raw: a,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "social_account_id" },
        );
        if (stErr) result.errors.push(`stats ${zid}: ${stErr.message}`);
        else result.followers++;

        const series = asArray(statsMap[zid]) as Record<string, unknown>[];
        for (const pt of series) {
          const date = str(pt.date);
          const followers = int(pt.followers, pt.value, pt.count);
          if (!date) continue;
          await admin.from("zernio_account_daily").upsert(
            {
              owner_id: match.owner_id,
              social_account_id: match.social_account_id,
              platform: match.platform,
              date: date.slice(0, 10),
              followers,
            },
            { onConflict: "social_account_id,date" },
          );
          result.daily++;
        }
      }
    }

    // ── 2) Per-post analytics ──────────────────────────────────────────────────
    const pa = await zernioGet(zernioKey, "/analytics?source=all&limit=50");
    if (!pa.ok) {
      result.errors.push(`analytics ${pa.status}: ${str(pa.body.error) ?? "failed"}`);
    } else {
      const posts = (asArray(pa.body.posts).length
        ? asArray(pa.body.posts)
        : asArray(pa.body.data)) as Record<string, unknown>[];
      for (const post of posts) {
        const zPostId = str(post._id, post.id, post.postId);
        const caption = str(post.content, post.caption, post.title);
        const postedAt = str(post.publishedAt, post.scheduledFor, post.createdAt);
        const platforms = asArray(post.platforms).length
          ? asArray(post.platforms)
          : asArray(post.platformAnalytics);
        for (const pe of platforms as Record<string, unknown>[]) {
          const platform = str(pe.platform);
          const accId = str(pe.account_id, pe.accountId);
          const platformPostId = str(pe.platform_post_id, pe.platformPostId);
          if (!platform || !platformPostId) continue;
          const match = accId ? accountMap.get(accId) : undefined;
          // owner_id is NOT NULL — skip posts whose account we can't resolve
          // (otherwise the upsert throws and the row is silently lost).
          if (!match?.owner_id) continue;
          const m = (pe.analytics ?? pe) as Record<string, unknown>;
          const { error: upErr } = await admin.from("zernio_post_analytics").upsert(
            {
              owner_id: match.owner_id,
              social_account_id: match.social_account_id,
              platform,
              zernio_post_id: zPostId,
              platform_post_id: platformPostId,
              platform_post_url: str(pe.platform_post_url, pe.platformPostUrl),
              caption,
              thumbnail_url: str(pe.thumbnail, post.thumbnail),
              posted_at: postedAt,
              impressions: int(m.impressions),
              reach: int(m.reach),
              likes: int(m.likes),
              comments: int(m.comments),
              shares: int(m.shares),
              saves: int(m.saves),
              clicks: int(m.clicks),
              views: int(m.views),
              engagement_rate: num(m.engagement_rate, m.engagementRate),
              raw: pe,
              synced_at: new Date().toISOString(),
            },
            { onConflict: "platform,platform_post_id" },
          );
          if (upErr) result.errors.push(`post ${platformPostId}: ${upErr.message}`);
          else result.posts++;
        }
      }
    }

    // Report ok:false when nothing wrote but errors occurred, so the dashboard's
    // refresh toast reflects reality instead of always claiming success.
    const wroteSomething = result.followers + result.daily + result.posts > 0;
    return json(200, { ok: wroteSomething || result.errors.length === 0, ...result });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : "unknown" });
  }
});
