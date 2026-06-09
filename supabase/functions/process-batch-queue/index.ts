// process-batch-queue: cron-invoked worker for the batch upload flow.
//
// The client uploads N videos to Bunny, then creates one scheduled_posts row per
// video with prep_status='queued', a future scheduled_at (an assigned optimal
// slot) and publish_jobs per platform. This worker — dispatched every minute by
// pg_cron via dispatch_batch_tick() — picks queued rows, generates captions
// server-side (Whisper transcript + Claude copy via generate-captions, persisted
// onto the row) and flips them to status='scheduled' so scheduler-tick publishes
// them when due. The user can close the app after the Bunny upload finishes;
// transcription/captioning/scheduling all happen here.
//
// Auth: verify_jwt:true → gateway validates the JWT. We then require the caller
// to be service-role (same pattern as scheduler-tick).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Max captioning attempts before giving up. A fresh Bunny upload may still be
// encoding for the first few ticks (transcribe-bunny-video returns an error
// until status=4), so we retry across minutes before marking failed.
const MAX_ATTEMPTS = 8;
// How many queued rows to process per tick — keeps us well under the function
// timeout even when each one does a Whisper + Claude round-trip.
const BATCH_LIMIT = 4;

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

type PublishPlatform = "instagram" | "youtube" | "tiktok";

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

    // Pick the oldest queued rows.
    const { data: queued, error } = await admin
      .from("scheduled_posts")
      .select("id, owner_id, format_id, prep_attempts")
      .eq("prep_status", "queued")
      .order("created_at", { ascending: true })
      .limit(BATCH_LIMIT);
    if (error) return json(500, { error: error.message });

    let processed = 0;
    let ready = 0;
    let failed = 0;
    let requeued = 0;

    for (const post of queued ?? []) {
      // Atomically claim: queued → captioning (also bump attempts).
      const nextAttempts = (post.prep_attempts ?? 0) + 1;
      const { data: claimed, error: cErr } = await admin
        .from("scheduled_posts")
        .update({ prep_status: "captioning", prep_attempts: nextAttempts })
        .eq("id", post.id)
        .eq("prep_status", "queued")
        .select("id")
        .maybeSingle();
      if (cErr || !claimed) continue;
      processed++;

      // Resolve the platforms from the post's publish_jobs.
      const { data: jobs } = await admin
        .from("publish_jobs")
        .select("platform")
        .eq("scheduled_post_id", post.id);
      const platforms = Array.from(
        new Set((jobs ?? []).map((j) => j.platform as PublishPlatform)),
      );

      let captionError: string | null = null;
      try {
        const r = await fetch(`${supabaseUrl}/functions/v1/generate-captions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
          body: JSON.stringify({
            scheduled_post_id: post.id,
            platforms: platforms.length ? platforms : undefined,
            format_id: post.format_id ?? undefined,
            persist: true,
          }),
        });
        if (!r.ok) {
          let msg = `generate_captions_${r.status}`;
          try {
            const j = (await r.json()) as { error?: string };
            if (j?.error) msg = j.error;
          } catch {
            // ignore parse errors
          }
          captionError = msg;
        }
      } catch (e) {
        captionError = e instanceof Error ? e.message : String(e);
      }

      if (!captionError) {
        // Captions persisted by generate-captions. Flip to scheduled so
        // scheduler-tick publishes it at scheduled_at.
        await admin
          .from("scheduled_posts")
          .update({ prep_status: "ready", prep_error: null, status: "scheduled" })
          .eq("id", post.id);
        ready++;
      } else if (nextAttempts >= MAX_ATTEMPTS) {
        await admin
          .from("scheduled_posts")
          .update({ prep_status: "failed", prep_error: captionError })
          .eq("id", post.id);
        failed++;
        // Notify the owner so a stuck upload doesn't fail silently.
        try {
          await admin.from("notifications").insert({
            user_id: post.owner_id,
            kind: "publishing.batch_failed",
            title: "Un video del lote no se pudo preparar",
            body: captionError.slice(0, 160),
            link: `/app/admin/publishing/${post.id}`,
            dedupe_key: `pub:batch:fail:${post.id}`,
          });
        } catch (e) {
          console.warn("notify_failed", e);
        }
      } else {
        // Retryable (e.g. Bunny still encoding) — back to queued for next tick.
        await admin
          .from("scheduled_posts")
          .update({ prep_status: "queued", prep_error: captionError })
          .eq("id", post.id);
        requeued++;
      }
    }

    return json(200, {
      ok: true,
      scanned: queued?.length ?? 0,
      processed,
      ready,
      failed,
      requeued,
    });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : "unknown" });
  }
});
