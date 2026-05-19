// send-push: server-side web push fan-out using VAPID.
// Auth: verify_jwt:true at the gateway, then we require service-role inside —
// accepting either an exact match against our env (covers same-project service
// callers including sb_secret_… format) or any JWT with role=service_role.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

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
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!isServiceRoleCaller(req, serviceKey)) {
      return json(401, { error: "service_role_only" });
    }

    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:hola@ezequiellamas.com";
    if (!vapidPublic || !vapidPrivate) {
      return json(500, { error: "vapid_not_configured" });
    }
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    const body = (await req.json()) as {
      user_id: string;
      title: string;
      body?: string;
      url?: string;
      icon?: string;
      tag?: string;
    };
    if (!body?.user_id || !body?.title) return json(400, { error: "missing_fields" });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
    const { data: subs, error } = await admin
      .from("web_push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", body.user_id);
    if (error) return json(500, { error: error.message });

    const payload = JSON.stringify({
      title: body.title,
      body: body.body ?? "",
      url: body.url ?? "/",
      icon: body.icon,
      tag: body.tag,
    });

    let sent = 0;
    let failed = 0;
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 60 },
        );
        sent++;
        await admin
          .from("web_push_subscriptions")
          .update({ last_seen_at: new Date().toISOString(), failed_count: 0, last_error: null })
          .eq("id", s.id);
      } catch (e: unknown) {
        failed++;
        const err = e as { statusCode?: number; body?: string; message?: string };
        const status = err.statusCode ?? 0;
        if (status === 404 || status === 410) {
          await admin.from("web_push_subscriptions").delete().eq("id", s.id);
        } else {
          await admin
            .from("web_push_subscriptions")
            .update({
              failed_count: 1,
              last_error: err.message ?? `status_${status}`,
            })
            .eq("id", s.id);
        }
      }
    }

    return json(200, { ok: true, sent, failed, total: subs?.length ?? 0 });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : "unknown" });
  }
});
