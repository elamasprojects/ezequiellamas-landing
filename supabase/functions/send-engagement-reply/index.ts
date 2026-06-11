// send-engagement-reply: posts an approved (optionally edited) reply back to the
// platform via Zernio. Comments → POST /v1/comments (parentCommentId); DMs →
// POST /v1/messages (conversationId). DMs are refused outside Meta's 24h window.
//
// Auth: verify_jwt:true. The caller's JWT (admin) loads the row under RLS, so a
// user can only send their own queued replies.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const ZERNIO_BASE = "https://zernio.com/api/v1";
const DM_WINDOW_MS = 24 * 60 * 60 * 1000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method" });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json(401, { error: "unauthorized" });
    const zernioKey = Deno.env.get("ZERNIO_API_KEY");
    if (!zernioKey) return json(500, { error: "ZERNIO_API_KEY not set" });

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: u } = await userClient.auth.getUser();
    if (!u.user) return json(401, { error: "unauthenticated" });

    const body = (await req.json().catch(() => ({}))) as { reply_id?: string; text?: string };
    if (!body.reply_id) return json(400, { error: "reply_id required" });

    const { data: reply, error: rErr } = await userClient
      .from("engagement_replies")
      .select("*")
      .eq("id", body.reply_id)
      .maybeSingle();
    if (rErr || !reply) return json(404, { error: "not_found" });
    if (reply.status === "sent") return json(409, { error: "already_sent" });

    const text = (body.text ?? reply.edited_text ?? reply.ai_draft ?? "").trim();
    if (!text) return json(400, { error: "empty_text" });

    // DM 24h window guard.
    if (reply.kind === "dm" && reply.received_at) {
      const age = Date.now() - new Date(reply.received_at as string).getTime();
      if (age > DM_WINDOW_MS) {
        await userClient
          .from("engagement_replies")
          .update({ status: "expired", error: "Fuera de la ventana de 24h de Meta", edited_text: text })
          .eq("id", reply.id);
        return json(422, { error: "dm_window_expired" });
      }
    }

    const accountId = reply.zernio_account_id as string | null;
    let path: string;
    let payload: Record<string, unknown>;
    if (reply.kind === "comment") {
      path = "/comments";
      payload = {
        text,
        accountId,
        postId: reply.post_id,
        parentCommentId: reply.parent_comment_id,
      };
    } else {
      path = "/messages";
      payload = { text, accountId, conversationId: reply.conversation_id };
    }

    const r = await fetch(`${ZERNIO_BASE}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${zernioKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const zres = (await r.json().catch(() => ({}))) as Record<string, unknown>;

    if (!r.ok) {
      await userClient
        .from("engagement_replies")
        .update({ status: "failed", error: (zres.error as string) ?? `zernio_${r.status}`, edited_text: text, zernio_response: zres })
        .eq("id", reply.id);
      return json(502, { error: (zres.error as string) ?? `zernio_${r.status}` });
    }

    await userClient
      .from("engagement_replies")
      .update({ status: "sent", sent_at: new Date().toISOString(), edited_text: text, zernio_response: zres, error: null })
      .eq("id", reply.id);

    return json(200, { ok: true });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : "unknown" });
  }
});
