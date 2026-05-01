// bulk-analyze-referents — dispara analyze-referent-video en paralelo
// para todos los referent_videos del caller (admin) que aún no estén analizados.
// Devuelve immediately con el count; el procesamiento corre en background
// (cada fetch spawnea su propia edge instance).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

interface BulkBody {
  referent_id?: string;
  force?: boolean;
  limit?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Missing Authorization" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthenticated" }, 401);

    const body = (await req.json().catch(() => ({}))) as BulkBody;
    const force = !!body.force;
    const limit = Math.max(1, Math.min(body.limit ?? 200, 500));

    // Pull pending videos via RLS (admin sees only their own referentes' videos).
    let query = userClient
      .from("referent_videos")
      .select("id, referent_id, transcript_status, concept_status")
      .order("views_total", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (body.referent_id) query = query.eq("referent_id", body.referent_id);

    if (!force) {
      // Pending if either side hasn't completed.
      query = query.or(
        "transcript_status.is.null,transcript_status.eq.idle,transcript_status.eq.failed,concept_status.is.null,concept_status.eq.idle,concept_status.eq.failed",
      );
    }

    const { data: rows, error } = await query;
    if (error) return json({ error: error.message }, 500);

    const ids = (rows ?? []).map((r) => r.id);
    if (ids.length === 0) {
      return json({ ok: true, dispatched: 0, ids: [] });
    }

    const fnUrl = `${SUPABASE_URL}/functions/v1/analyze-referent-video`;

    // Fire-and-forget POSTs. Wrapped in EdgeRuntime.waitUntil so the runtime
    // doesn't kill them when this handler returns. Each fetch lands on its
    // own edge instance and runs independently.
    const dispatch = Promise.allSettled(
      ids.map((id) =>
        fetch(fnUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: SUPABASE_SERVICE_ROLE_KEY,
          },
          body: JSON.stringify({ referent_video_id: id, force }),
        }).then((r) => ({ id, status: r.status })).catch((e) => ({
          id,
          status: 0,
          error: String(e),
        })),
      ),
    );

    // deno-lint-ignore no-explicit-any
    const rt = (globalThis as any).EdgeRuntime;
    if (rt && typeof rt.waitUntil === "function") rt.waitUntil(dispatch);

    return json({ ok: true, dispatched: ids.length, ids });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return json({ error: msg }, 500);
  }
});
