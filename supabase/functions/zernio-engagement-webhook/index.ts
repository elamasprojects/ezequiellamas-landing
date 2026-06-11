// zernio-engagement-webhook: receives Zernio `comment.received` + `message.received`
// events and records them in the engagement_replies approval queue (status='drafting').
// The AI draft is generated separately by the draft-engagement-replies cron worker
// so this handler can ack within Zernio's 5s window. No auto-send (approval mode).
//
// Auth: verify_jwt:false → validated by HMAC signature (X-Zernio-Signature).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-zernio-signature, x-late-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function str(...vals: unknown[]): string | null {
  for (const v of vals) if (typeof v === "string" && v.length) return v;
  return null;
}

async function verifyHmac(secret: string, rawBody: string, signature: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === signature.toLowerCase();
}

interface AccountMatch {
  social_account_id: string;
  owner_id: string;
}
async function resolveAccount(admin: SupabaseClient, zernioAccountId: string): Promise<AccountMatch | null> {
  const { data } = await admin
    .from("social_accounts")
    .select("id, owner_id, external_account_id, meta")
    .or(`external_account_id.eq.${zernioAccountId},meta->>zernio_account_id.eq.${zernioAccountId}`)
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { social_account_id: data.id as string, owner_id: data.owner_id as string };
}

// Comments: IG + YouTube. DMs: Instagram only (our connected DM-capable account).
const COMMENT_PLATFORMS = new Set(["instagram", "youtube"]);
const DM_PLATFORMS = new Set(["instagram"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method" });

  try {
    const rawBody = await req.text();
    const secret = Deno.env.get("ZERNIO_WEBHOOK_SECRET");
    const signature = req.headers.get("X-Zernio-Signature") ?? req.headers.get("X-Late-Signature") ?? "";
    if (secret) {
      const ok = signature && (await verifyHmac(secret, rawBody, signature));
      if (!ok) return json(401, { error: "invalid_signature" });
    } // else: accept unsigned (tech debt for single-user, like zernio-webhook)

    const event = JSON.parse(rawBody) as Record<string, unknown>;
    const type = str(event.event);
    if (type !== "comment.received" && type !== "message.received") {
      return json(200, { ok: true, ignored: type });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const account = (event.account ?? {}) as Record<string, unknown>;
    const zAccId = str(account.id, account._id);
    if (!zAccId) return json(200, { ok: true, skipped: "no_account" });
    const match = await resolveAccount(admin, zAccId);
    if (!match) return json(200, { ok: true, skipped: "unknown_account" });

    const { data: settings } = await admin
      .from("engagement_settings")
      .select("enabled, comments_enabled, dms_enabled")
      .eq("owner_id", match.owner_id)
      .maybeSingle();
    if (!settings?.enabled) return json(200, { ok: true, skipped: "disabled" });

    let row: Record<string, unknown> | null = null;

    if (type === "comment.received" && settings.comments_enabled) {
      const c = (event.comment ?? {}) as Record<string, unknown>;
      const platform = str(account.platform, c.platform) ?? "";
      if (!COMMENT_PLATFORMS.has(platform)) return json(200, { ok: true, skipped: "platform" });
      const commentId = str(c.id, c._id);
      if (!commentId) return json(200, { ok: true, skipped: "no_comment_id" });
      const author = (c.author ?? {}) as Record<string, unknown>;
      row = {
        owner_id: match.owner_id,
        kind: "comment",
        platform,
        zernio_account_id: zAccId,
        social_account_id: match.social_account_id,
        source_text: str(c.text),
        author_name: str(author.name, author.displayName),
        author_handle: str(author.username, author.handle),
        post_id: str(c.postId, c.platformPostId),
        parent_comment_id: commentId,
        platform_post_url: str(c.platformPostUrl, ((event.post ?? {}) as Record<string, unknown>).platformPostUrl),
        status: "drafting",
        received_at: str(c.createdAt) ?? new Date().toISOString(),
        dedupe_key: `comment:${commentId}`,
      };
    } else if (type === "message.received" && settings.dms_enabled) {
      const m = (event.message ?? {}) as Record<string, unknown>;
      const conv = (event.conversation ?? {}) as Record<string, unknown>;
      const platform = str(account.platform, m.platform) ?? "";
      if (!DM_PLATFORMS.has(platform)) return json(200, { ok: true, skipped: "platform" });
      if (str(m.direction) && str(m.direction) !== "incoming") return json(200, { ok: true, skipped: "outgoing" });
      const messageId = str(m.id, m._id);
      const conversationId = str(m.conversationId, conv.id, conv._id);
      if (!messageId || !conversationId) return json(200, { ok: true, skipped: "no_ids" });
      const sender = (m.sender ?? {}) as Record<string, unknown>;
      row = {
        owner_id: match.owner_id,
        kind: "dm",
        platform,
        zernio_account_id: zAccId,
        social_account_id: match.social_account_id,
        source_text: str(m.text),
        author_name: str(sender.name, sender.displayName),
        author_handle: str(sender.username, sender.handle),
        conversation_id: conversationId,
        status: "drafting",
        received_at: str(m.sentAt) ?? new Date().toISOString(),
        dedupe_key: `dm:${messageId}`,
      };
    }

    if (!row || !row.source_text) return json(200, { ok: true, skipped: "no_text_or_kind" });

    // Ignore duplicate deliveries (webhook retries) via the unique dedupe index.
    const { error } = await admin.from("engagement_replies").insert(row);
    if (error && !/(duplicate|unique)/i.test(error.message)) {
      console.warn("insert_failed", error.message);
    }
    return json(200, { ok: true });
  } catch (e) {
    // Always 200-ish to avoid Zernio dead-lettering on transient errors? No — return
    // 500 so it retries; the dedupe index keeps it idempotent.
    return json(500, { error: e instanceof Error ? e.message : "unknown" });
  }
});
