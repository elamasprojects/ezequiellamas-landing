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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json(401, { error: "missing_auth" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: uErr } = await userClient.auth.getUser();
    if (uErr || !userData.user) return json(401, { error: "unauthenticated" });
    const userId = userData.user.id;

    const body = (await req.json()) as {
      endpoint?: string;
      p256dh?: string;
      auth?: string;
      user_agent?: string;
      device_label?: string;
    };
    if (!body?.endpoint || !body?.p256dh || !body?.auth) {
      return json(400, { error: "missing_subscription_fields" });
    }

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = await admin
      .from("web_push_subscriptions")
      .upsert(
        {
          user_id: userId,
          endpoint: body.endpoint,
          p256dh: body.p256dh,
          auth: body.auth,
          user_agent: body.user_agent ?? null,
          device_label: body.device_label ?? null,
          last_seen_at: new Date().toISOString(),
          failed_count: 0,
          last_error: null,
        },
        { onConflict: "endpoint" },
      );
    if (error) return json(500, { error: error.message });

    return json(200, { ok: true });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : "unknown" });
  }
});
