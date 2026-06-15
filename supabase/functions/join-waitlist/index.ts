import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Public endpoint (verify_jwt = false): the Content Center product landing
// waitlist. Anonymous visitors POST their email; we upsert into
// content_center_waitlist with the service role (anon has no INSERT policy)
// and send a branded welcome email via Resend. Idempotent per email.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const APP_URL = Deno.env.get("APP_URL") ?? "https://ezequiellamas.com";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "Ezequiel Lamas <hola@updates.ezequiellamas.com>";

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_PLATFORMS = new Set(["instagram", "youtube", "tiktok"]);

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
};

function renderWelcomeEmail(opts: { name?: string | null; platforms: string[]; url: string }) {
  const subject = "Estás en la lista de Content Center";
  const hi = opts.name && opts.name.trim() ? `Hola, ${opts.name.trim()}` : "Hola";
  const platformLine = opts.platforms.length
    ? `<p style="margin:0 0 16px;font-size:13px;color:#5a5550;">Anotamos que creás en ${opts.platforms
        .map((p) => PLATFORM_LABELS[p] ?? p)
        .join(" · ")}. Voy a tener eso en cuenta cuando te mande novedades.</p>`
    : "";

  const html = `<div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0a0a0a;background:#ffffff;">
    <div style="text-align:left;margin-bottom:24px;">
      <span style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;color:#5a5550;">Content Center · Lista de espera</span>
    </div>
    <h1 style="font-family:Georgia,serif;font-style:italic;font-size:28px;line-height:1.1;margin:0 0 24px;">Ya estás en la <span style="color:#0a0a0a;background:#c8ff00;padding:0 8px;">lista</span></h1>

    <p style="margin:0 0 16px;color:#0a0a0a;">${hi}. Gracias por anotarte.</p>

    <p style="margin:0 0 16px;color:#0a0a0a;"><strong>Content Center es el centro de comando que uso todos los días</strong> para correr mi marca: guiones con IA, inteligencia de referentes, producción, publicación en todas las plataformas, métricas y predicción de viralidad — todo en un solo lugar.</p>

    <p style="margin:0 0 16px;color:#0a0a0a;">El producto ya existe y está en uso. Lo estoy preparando para abrirlo al público, y vos vas a ser de los primeros en enterarte cuando esté disponible.</p>

    <div style="border-left:3px solid #c8ff00;padding:12px 18px;margin:24px 0;background:#fafafa;border-radius:0 8px 8px 0;">
      <p style="margin:0;font-size:14px;color:#0a0a0a;">Mientras tanto te voy a ir mandando novedades de vez en cuando. Sin spam, y sin prometerte fechas — cuando esté, te aviso.</p>
    </div>

    ${platformLine}

    <p style="margin:24px 0 12px;"><a href="${opts.url}" style="display:inline-block;background:#c8ff00;color:#0a0a0a;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Ver Content Center</a></p>

    <hr style="border:none;border-top:1px solid #e5e5e5;margin:32px 0;" />

    <p style="margin-top:0;color:#8a8580;font-size:12px;">Ezequiel Lamas · ezequiellamas.com</p>
  </div>`;
  return { subject, html };
}

async function sendResendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend ${res.status}: ${err.slice(0, 500)}`);
  }
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));

    // Honeypot: bots fill the hidden "website" field. Pretend success, do nothing.
    if (typeof body?.website === "string" && body.website.trim() !== "") {
      return json({ ok: true });
    }

    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!EMAIL_RE.test(email) || email.length > 254) {
      return json({ error: "Email inválido" }, 400);
    }

    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 120) || null : null;
    const platforms: string[] = Array.isArray(body?.platforms)
      ? [...new Set(body.platforms.filter((p: unknown) => typeof p === "string" && VALID_PLATFORMS.has(p)))]
      : [];
    const user_agent = req.headers.get("user-agent")?.slice(0, 500) ?? null;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Has this email already signed up? (idempotent — don't re-email.)
    const { data: existing } = await admin
      .from("content_center_waitlist")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return json({ ok: true, already: true });
    }

    const { error: insErr } = await admin.from("content_center_waitlist").insert({
      email,
      name,
      platforms,
      user_agent,
      source: "content-center",
    });

    if (insErr) {
      // Unique-violation race → treat as already on the list.
      if ((insErr as { code?: string }).code === "23505") {
        return json({ ok: true, already: true });
      }
      return json({ error: insErr.message }, 500);
    }

    // Fire the welcome email. If Resend fails, the signup still stands — report
    // it but don't 500 the whole request (the row is saved).
    const tpl = renderWelcomeEmail({ name, platforms, url: `${APP_URL}/content-center` });
    try {
      await sendResendEmail(email, tpl.subject, tpl.html);
      return json({ ok: true, emailed: true });
    } catch (mailErr) {
      return json({ ok: true, emailed: false, email_error: mailErr instanceof Error ? mailErr.message : String(mailErr) });
    }
  } catch (err) {
    return json({ error: String(err instanceof Error ? err.message : err) }, 500);
  }
});
