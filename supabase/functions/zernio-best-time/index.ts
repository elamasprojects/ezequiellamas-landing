// zernio-best-time: proxies GET /v1/analytics/best-time from Zernio (the API key
// is server-side only). Returns the raw slots[] so the client can convert UTC →
// local and seed publishing_slots. Requires the Analytics add-on on the Zernio
// side (returns its 402/403 through if missing).
//
// Auth: verify_jwt:true gateway (any authenticated admin can call it).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method" });

  try {
    if (!(req.headers.get("Authorization") ?? "").startsWith("Bearer ")) {
      return json(401, { error: "unauthorized" });
    }
    const zernioKey = Deno.env.get("ZERNIO_API_KEY");
    if (!zernioKey) return json(500, { error: "ZERNIO_API_KEY not set" });

    const body = (await req.json().catch(() => ({}))) as { platform?: string };
    const qs = body.platform ? `?platform=${encodeURIComponent(body.platform)}` : "";

    const r = await fetch(`${ZERNIO_BASE}/analytics/best-time${qs}`, {
      headers: { Authorization: `Bearer ${zernioKey}`, "Content-Type": "application/json" },
    });
    const payload = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    if (!r.ok) {
      return json(r.status === 402 || r.status === 403 ? 402 : 502, {
        error: (payload.error as string) ?? `zernio_${r.status}`,
        requiresAddon: r.status === 402 || r.status === 403,
      });
    }

    // Zernio returns { slots: [{ day_of_week, hour, avg_engagement, post_count }] }.
    const slots = Array.isArray(payload.slots) ? payload.slots : [];
    return json(200, { ok: true, slots });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : "unknown" });
  }
});
