// evaluate-prediction — captures the REAL result of a published post and computes
// the prediction error (no LLM, pure arithmetic). Closes the self-improving loop:
// predict-virality reads these evaluated rows as a calibration signal.
//
// Modes (body): { scheduled_post_id } | { video_post_id } | { prediction_id } |
//               { sweep: true, max? }
//
// For each prediction row (status='predicted'), it resolves the realized
// video_post for (scheduled_post, platform), reads the latest views, and writes
// actual_views + errors. status flips to 'evaluated' only once the post is >=7
// days published (maturity gate); before that it writes a PROVISIONAL actual for
// the UI but keeps status='predicted' so the sweep re-checks it (and calibration,
// which reads status='evaluated', isn't polluted by immature data).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MODEL_VERSION = "virality-v1";
const MATURITY_DAYS = 7;

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

// Same per-platform-vs-median thresholds as predict-virality (and the multiplier trigger).
function tierFromRatio(r: number | null): string {
  if (r == null || !isFinite(r)) return "normal";
  if (r >= 7) return "outlier";
  if (r >= 5) return "5x";
  if (r >= 3) return "3x";
  if (r >= 0.5) return "normal";
  return "underperform";
}

// Map an actual/median ratio to the same 0-100 frame the model scores in
// (ratio 1 -> 50, 2 -> 75, 0.5 -> 25, >=4 -> 100), for score_error.
function scoreFromRatio(r: number | null): number {
  if (r == null || !isFinite(r) || r <= 0) return 50;
  return Math.max(0, Math.min(100, Math.round(50 + 25 * Math.log2(r))));
}

function normalizeUrl(u: string | null | undefined): string | null {
  if (!u) return null;
  try {
    const url = new URL(u);
    return `${url.host}${url.pathname}`.replace(/\/+$/, "").toLowerCase();
  } catch {
    return u.split("?")[0].replace(/\/+$/, "").toLowerCase();
  }
}

interface SpHint {
  status?: string;
  published_at?: string | null;
  scheduled_at?: string | null;
}

interface PredictionRow {
  id: string;
  owner_id: string;
  scheduled_post_id: string;
  platform: string;
  status?: string;
  video_post_id: string | null;
  predicted_virality_score: number;
  predicted_views_point: number;
  predicted_views_low: number;
  predicted_views_high: number;
  baseline_snapshot: Record<string, unknown> | null;
  // Present only in sweep mode (embedded join) — lets evaluateOne skip a re-fetch.
  scheduled_posts?: SpHint | SpHint[] | null;
}

// deno-lint-ignore no-explicit-any
type Db = any;

/** Resolve the realized video_post id for a prediction's (scheduled_post, platform). */
async function resolveVideoPostId(db: Db, pred: PredictionRow, liveAt: string | null): Promise<string | null> {
  if (pred.video_post_id) return pred.video_post_id;

  const { data: job } = await db
    .from("publish_jobs")
    .select("video_post_id, provider_post_url")
    .eq("scheduled_post_id", pred.scheduled_post_id)
    .eq("platform", pred.platform)
    .maybeSingle();

  if (job?.video_post_id) return job.video_post_id as string;

  // Fallback A: match the provider post URL to a video_posts.source_url (owner-scoped).
  const { data: ownPosts } = await db
    .from("video_posts")
    .select("id, source_url, posted_at, videos!inner(owner_id)")
    .eq("platform", pred.platform)
    .eq("videos.owner_id", pred.owner_id);
  const posts = (ownPosts ?? []) as Array<{ id: string; source_url: string; posted_at: string | null }>;

  if (job?.provider_post_url) {
    const target = normalizeUrl(job.provider_post_url as string);
    const hit = posts.find((p) => normalizeUrl(p.source_url) === target);
    if (hit) return hit.id;
  }

  // Fallback B: nearest posted_at to when the post went live, accepted ONLY if
  // confidently close (<=24h). A looser window can bind to a DIFFERENT post when
  // the creator published several on the same platform days apart, silently
  // corrupting the actual + calibration. If nothing is within 24h, skip (the
  // authoritative link from the webhook, or a later scrape, can resolve it).
  const refTime = new Date(liveAt ?? Date.now()).getTime();
  let best: { id: string; dist: number } | null = null;
  for (const p of posts) {
    if (!p.posted_at) continue;
    const dist = Math.abs(new Date(p.posted_at).getTime() - refTime);
    if (!best || dist < best.dist) best = { id: p.id, dist };
  }
  return best && best.dist <= 24 * 3600_000 ? best.id : null;
}

async function latestViews(db: Db, videoPostId: string): Promise<{ views: number | null; at: string | null }> {
  const { data: hist } = await db
    .from("video_metrics_history")
    .select("views_total, captured_at")
    .eq("video_post_id", videoPostId)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (hist && typeof hist.views_total === "number") {
    return { views: hist.views_total, at: hist.captured_at };
  }
  const { data: vp } = await db
    .from("video_posts")
    .select("views_total, metrics_updated_at")
    .eq("id", videoPostId)
    .maybeSingle();
  return { views: vp?.views_total ?? null, at: vp?.metrics_updated_at ?? null };
}

async function evaluateOne(db: Db, pred: PredictionRow, spHint?: SpHint | null): Promise<"evaluated" | "provisional" | "skipped"> {
  // Only evaluate posts that actually went live — avoids false posted_at matches
  // for drafts/scheduled posts that were never published. In sweep mode the
  // scheduled_post is already joined, so reuse it instead of re-fetching per row.
  const sp = spHint ?? (await db
    .from("scheduled_posts")
    .select("status, published_at, scheduled_at")
    .eq("id", pred.scheduled_post_id)
    .maybeSingle()).data as SpHint | null;
  if (!sp || (sp.status !== "published" && sp.status !== "partial")) return "skipped";
  const liveAt = sp.published_at ?? sp.scheduled_at ?? null;

  const videoPostId = await resolveVideoPostId(db, pred, liveAt);
  if (!videoPostId) return "skipped";

  const { views: actual, at } = await latestViews(db, videoPostId);
  // 0 / negative views ≈ "not scraped yet" — skip and retry rather than finalize a
  // meaningless error (point/0 → huge %) against it.
  if (actual == null || actual <= 0) return "skipped";

  const days = liveAt ? (Date.now() - new Date(liveAt).getTime()) / 86400_000 : 0;
  const mature = days >= MATURITY_DAYS;
  const horizon = days >= 30 ? "d30" : days >= MATURITY_DAYS ? "d7" : "provisional";

  const median = Number(pred.baseline_snapshot?.["median"]) || null;
  const ratio = median && median > 0 ? actual / median : null;
  const point = pred.predicted_views_point ?? 0;
  const denom = Math.max(actual, 1);

  const abs_pct_error = Math.round((Math.abs(point - actual) / denom) * 100);
  const signed_pct_error = Math.round(((point - actual) / denom) * 100);
  const within_range = actual >= (pred.predicted_views_low ?? 0) && actual <= (pred.predicted_views_high ?? 0);
  const score_error = (pred.predicted_virality_score ?? 0) - scoreFromRatio(ratio);

  await db
    .from("post_predictions")
    .update({
      video_post_id: videoPostId,
      actual_views: actual,
      actual_tier: tierFromRatio(ratio),
      actual_captured_at: at ?? new Date().toISOString(),
      horizon_label: horizon,
      abs_pct_error,
      signed_pct_error,
      within_range,
      score_error,
      evaluated_at: new Date().toISOString(),
      status: mature ? "evaluated" : "predicted",
    })
    .eq("id", pred.id);

  return mature ? "evaluated" : "provisional";
}

const PRED_COLS =
  "id, owner_id, scheduled_post_id, platform, status, video_post_id, predicted_virality_score, predicted_views_point, predicted_views_low, predicted_views_high, baseline_snapshot";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const isServiceRole = isServiceRoleCaller(req, SUPABASE_SERVICE_ROLE_KEY);
    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let callerId: string | null = null;
    if (!isServiceRole) {
      const authHeader = req.headers.get("Authorization") ?? "";
      if (!authHeader) return json({ error: "Missing Authorization" }, 401);
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userErr } = await userClient.auth.getUser();
      if (userErr || !user) return json({ error: "Unauthenticated" }, 401);
      callerId = user.id;
    }

    const body = await req.json().catch(() => ({}));
    const sweep = body?.sweep === true;
    const max = typeof body?.max === "number" ? Math.min(200, body.max) : 50;

    let preds: PredictionRow[] = [];

    if (sweep) {
      if (!isServiceRole) return json({ error: "sweep requires service role" }, 403);
      // Predicted rows whose post is >=7 days live — only matured ones to finalize.
      const cutoff = new Date(Date.now() - MATURITY_DAYS * 86400_000).toISOString();
      const { data } = await service
        .from("post_predictions")
        .select(`${PRED_COLS}, scheduled_posts!inner(status, published_at, scheduled_at)`)
        .eq("status", "predicted")
        .eq("model_version", MODEL_VERSION)
        .or(`published_at.lte.${cutoff},and(published_at.is.null,scheduled_at.lte.${cutoff})`, {
          foreignTable: "scheduled_posts",
        })
        .limit(max);
      preds = (data ?? []) as unknown as PredictionRow[];
    } else {
      let q = service.from("post_predictions").select(PRED_COLS).eq("model_version", MODEL_VERSION);
      if (typeof body?.prediction_id === "string") q = q.eq("id", body.prediction_id);
      else if (typeof body?.scheduled_post_id === "string") q = q.eq("scheduled_post_id", body.scheduled_post_id);
      else if (typeof body?.video_post_id === "string") q = q.eq("video_post_id", body.video_post_id);
      else return json({ error: "scheduled_post_id, video_post_id, prediction_id o sweep requerido" }, 400);
      const { data } = await q;
      preds = (data ?? []) as unknown as PredictionRow[];
      // Ownership check for user-invoked calls.
      if (!isServiceRole) preds = preds.filter((p) => p.owner_id === callerId);
      // Don't re-touch already-finalized rows (refresh/re-bind risk); the sweep
      // owns re-evaluation of matured rows.
      preds = preds.filter((p) => p.status !== "evaluated");
    }

    const results = { evaluated: 0, provisional: 0, skipped: 0 };
    for (const pred of preds) {
      try {
        const embedded = Array.isArray(pred.scheduled_posts) ? pred.scheduled_posts[0] : pred.scheduled_posts;
        const r = await evaluateOne(service, pred, embedded ?? undefined);
        results[r] += 1;
      } catch (e) {
        console.error(`evaluate-prediction: row ${pred.id} failed: ${e instanceof Error ? e.message : e}`);
        results.skipped += 1;
      }
    }

    return json({ ok: true, ...results, total: preds.length });
  } catch (err) {
    return json({ error: String(err instanceof Error ? err.message : err) }, 500);
  }
});
