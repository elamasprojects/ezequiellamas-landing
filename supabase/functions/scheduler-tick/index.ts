// scheduler-tick: cron-invoked. Picks due scheduled_posts and dispatches publish-now.
// Auth: verify_jwt:true → Supabase gateway validates the JWT signature. We then
// require the caller to be service-role, accepting either (a) the same string
// our env has (covers same-project service callers, including the sb_secret_…
// format) or (b) any JWT whose role=service_role claim parses out (covers the
// legacy service_role JWT stored in Vault when env has migrated formats).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
    const now = new Date().toISOString();

    // 1) Reminder T-30min: scan scheduled_posts in [now, now+30min]
    const reminderEnd = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const { data: upcoming } = await admin
      .from("scheduled_posts")
      .select("id, owner_id, title, scheduled_at")
      .eq("status", "scheduled")
      .gte("scheduled_at", now)
      .lte("scheduled_at", reminderEnd);

    let reminders = 0;
    for (const post of upcoming ?? []) {
      const dedupe = `pub:remind:${post.id}`;
      const { data: exists } = await admin
        .from("notifications")
        .select("id")
        .eq("user_id", post.owner_id)
        .eq("dedupe_key", dedupe)
        .maybeSingle();
      if (exists) continue;
      await admin.from("notifications").insert({
        user_id: post.owner_id,
        kind: "publishing.reminder",
        title: "Tu post sale en 30 min",
        body: post.title ?? "Revisá que esté todo OK antes.",
        link: `/app/admin/publishing/${post.id}`,
        dedupe_key: dedupe,
      });
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
          body: JSON.stringify({
            user_id: post.owner_id,
            title: "Tu post sale en 30 min",
            body: post.title ?? "Revisá antes",
            url: `/app/admin/publishing/${post.id}`,
          }),
        });
      } catch (e) {
        console.warn("push_failed", e);
      }
      reminders++;
    }

    // 2) Due publish: scheduled_at <= now and status = 'scheduled'
    const { data: due, error } = await admin
      .from("scheduled_posts")
      .select("id, owner_id")
      .eq("status", "scheduled")
      .lte("scheduled_at", now)
      .limit(20);
    if (error) return json(500, { error: error.message });

    let dispatched = 0;
    for (const post of due ?? []) {
      const { data: claimed, error: cErr } = await admin
        .from("scheduled_posts")
        .update({ status: "publishing" })
        .eq("id", post.id)
        .eq("status", "scheduled")
        .select("id")
        .maybeSingle();
      if (cErr) continue;
      if (!claimed) continue;

      try {
        const r = await fetch(`${supabaseUrl}/functions/v1/publish-now`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
          body: JSON.stringify({ scheduled_post_id: post.id }),
        });
        if (!r.ok) console.warn("publish_now_non_2xx", post.id, r.status);
        dispatched++;
      } catch (e) {
        console.warn("publish_now_failed", post.id, e);
      }
    }

    // 3) Cleanup expired oauth_states
    try {
      await admin.rpc("cleanup_expired_oauth_states");
    } catch (e) {
      console.warn("cleanup_oauth_failed", e);
    }

    return json(200, { ok: true, reminders, dispatched, scanned: due?.length ?? 0 });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : "unknown" });
  }
});
