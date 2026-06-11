// draft-engagement-replies: cron worker. Picks engagement_replies rows in
// status='drafting', generates an on-brand reply draft with Claude (using the
// creator profile + tone settings), and moves them to status='pending' for the
// owner to approve. No send happens here (approval mode).
//
// Auth: verify_jwt:true gateway + service-role required.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CLAUDE_MODEL = "claude-sonnet-4-6";
const LIMIT = 3;
const MAX_ATTEMPTS = 5;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS } });
}
function getJwtRole(a: string): string | null {
  const t = a.startsWith("Bearer ") ? a.slice(7) : a;
  const p = t.split(".");
  if (p.length !== 3) return null;
  try {
    const b = p[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b + "===".slice((b.length + 3) % 4))).role ?? null;
  } catch {
    return null;
  }
}
function isService(req: Request, key: string): boolean {
  const a = req.headers.get("Authorization") ?? "";
  const t = a.startsWith("Bearer ") ? a.slice(7) : a;
  return t === key || (req.headers.get("apikey") ?? "") === key || getJwtRole(a) === "service_role";
}

async function loadCreatorBlock(admin: SupabaseClient, ownerId: string): Promise<string> {
  const { data } = await admin
    .from("creator_profile")
    .select("who_am_i, product_service, target_audience, what_i_transmit")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (!data) return "";
  const parts = [
    data.who_am_i ? `Quién es: ${data.who_am_i}` : "",
    data.product_service ? `Qué ofrece: ${data.product_service}` : "",
    data.target_audience ? `Audiencia: ${data.target_audience}` : "",
    data.what_i_transmit ? `Tono/mensaje: ${data.what_i_transmit}` : "",
  ].filter(Boolean);
  return parts.length ? `\n\nPERFIL DEL CREADOR:\n${parts.join("\n")}` : "";
}

async function draftReply(input: {
  apiKey: string;
  kind: string;
  platform: string;
  sourceText: string;
  author: string | null;
  tone: string | null;
  creatorBlock: string;
}): Promise<string> {
  const kindLabel = input.kind === "dm" ? "mensaje directo (DM)" : "comentario";
  const system =
    `Sos el asistente de community management de un creador de contenido. Te paso un ${kindLabel} que recibió en ${input.platform}. ` +
    `Generá UNA sola respuesta, breve (1-3 frases), cálida y on-brand, en la voz del creador: español rioplatense, vos, sin sonar a bot. ` +
    `No inventes datos ni prometas cosas que no podés confirmar. Si es una pregunta que no se puede responder con certeza, respondé algo amable y breve. ` +
    `No uses hashtags ni "¡Hola! 😊" genérico de plantilla. Devolvé SOLO el texto de la respuesta, sin comillas.` +
    (input.tone ? `\n\nINSTRUCCIONES DE TONO DEL CREADOR: ${input.tone}` : "") +
    input.creatorBlock;
  const user = `${input.author ? `De: ${input.author}\n` : ""}${kindLabel}:\n"${input.sourceText}"`;

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": input.apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 400,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!r.ok) throw new Error(`claude_${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = (await r.json()) as { content: Array<{ type: string; text?: string }> };
  const text = j.content.find((c) => c.type === "text")?.text?.trim();
  if (!text) throw new Error("empty_draft");
  return text;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST" && req.method !== "GET") return json(405, { error: "method" });
  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!isService(req, serviceKey)) return json(401, { error: "service_role_only" });
    if (!anthropicKey) return json(500, { error: "ANTHROPIC_API_KEY not set" });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: rows } = await admin
      .from("engagement_replies")
      .select("id, owner_id, kind, platform, source_text, author_name, author_handle, attempts, updated_at")
      .eq("status", "drafting")
      .order("created_at", { ascending: true })
      .limit(LIMIT);

    let drafted = 0;
    let failed = 0;
    const toneCache = new Map<string, string | null>();
    const creatorCache = new Map<string, string>();

    for (const row of rows ?? []) {
      const nextAttempts = (row.attempts ?? 0) + 1;
      // Atomic claim via optimistic lock on updated_at.
      const { data: claimed } = await admin
        .from("engagement_replies")
        .update({ attempts: nextAttempts })
        .eq("id", row.id)
        .eq("updated_at", row.updated_at)
        .select("id")
        .maybeSingle();
      if (!claimed) continue;

      try {
        let tone = toneCache.get(row.owner_id);
        if (tone === undefined) {
          const { data: s } = await admin
            .from("engagement_settings")
            .select("tone_instructions")
            .eq("owner_id", row.owner_id)
            .maybeSingle();
          tone = s?.tone_instructions ?? null;
          toneCache.set(row.owner_id, tone);
        }
        let creatorBlock = creatorCache.get(row.owner_id);
        if (creatorBlock === undefined) {
          creatorBlock = await loadCreatorBlock(admin, row.owner_id);
          creatorCache.set(row.owner_id, creatorBlock);
        }

        const draft = await draftReply({
          apiKey: anthropicKey,
          kind: row.kind as string,
          platform: row.platform as string,
          sourceText: (row.source_text as string) ?? "",
          author: (row.author_name as string) ?? (row.author_handle as string) ?? null,
          tone,
          creatorBlock,
        });

        await admin
          .from("engagement_replies")
          .update({ ai_draft: draft, status: "pending", error: null })
          .eq("id", row.id);
        drafted++;

        // Notify the owner there's a reply to review.
        try {
          await admin.from("notifications").insert({
            user_id: row.owner_id,
            kind: "engagement.reply_pending",
            title: row.kind === "dm" ? "Nuevo DM para responder" : "Nuevo comentario para responder",
            body: ((row.source_text as string) ?? "").slice(0, 120),
            link: "/app/admin/engagement",
            dedupe_key: `engreply:${row.id}`,
          });
          await fetch(`${supabaseUrl}/functions/v1/send-push`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
            body: JSON.stringify({
              user_id: row.owner_id,
              title: "Respuesta lista para aprobar",
              body: "La IA preparó un borrador. Revisalo y enviá.",
              url: "/app/admin/engagement",
            }),
          }).catch(() => {});
        } catch (e) {
          console.warn("notify_failed", e);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (nextAttempts >= MAX_ATTEMPTS) {
          await admin.from("engagement_replies").update({ status: "failed", error: msg }).eq("id", row.id);
          failed++;
        } else {
          await admin.from("engagement_replies").update({ error: msg }).eq("id", row.id);
        }
      }
    }

    return json(200, { ok: true, scanned: rows?.length ?? 0, drafted, failed });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : "unknown" });
  }
});
