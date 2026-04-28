import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
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

interface Body {
  user_id?: string;
  kind?: string;
  title?: string;
  body?: string;
  link?: string;
  dedupe_key?: string;
  send_email?: boolean;
  send_push?: boolean;
  meta?: Record<string, string | number | null>;
}

const HEADER_HTML = `<div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0a0a0a;">`;
const FOOTER_HTML = `<p style="margin-top:32px;color:#8a8580;font-size:12px;">Ezequiel Lamas · ezequiellamas.com</p></div>`;

function button(label: string, url: string): string {
  return `<p style="margin:24px 0;"><a href="${url}" style="display:inline-block;background:#c8ff00;color:#0a0a0a;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">${label}</a></p>`;
}

function renderTemplate(kind: string, params: { title?: string; body?: string; link?: string; meta?: Record<string, string | number | null> }) {
  const link = params.link ?? APP_URL;
  const meta = params.meta ?? {};
  const ctitle = params.title ?? "Notificación";
  const cbody = params.body ?? "";

  switch (kind) {
    case "assignment_created":
      return {
        subject: `Nuevo video para editar — ${ctitle}`,
        html: `${HEADER_HTML}
          <h1 style="font-family:Georgia,serif;font-style:italic;font-size:24px;margin:0 0 16px;">Nuevo video <span style="color:#c8ff00;background:#0a0a0a;padding:0 8px;">para editar</span></h1>
          <p>Te asignaron una nueva edición: <strong>${ctitle}</strong>.</p>
          ${meta.due_date ? `<p>Plazo: <strong>${meta.due_date}</strong></p>` : ""}
          ${meta.payment ? `<p>Pago: <strong>${meta.payment}</strong></p>` : ""}
          ${cbody ? `<p style="color:#5a5550;">${cbody}</p>` : ""}
          ${button("Ver en la app", link)}
        ${FOOTER_HTML}`,
      };
    case "correction_requested":
      return {
        subject: `Pedimos correcciones — ${ctitle}`,
        html: `${HEADER_HTML}
          <h1 style="font-family:Georgia,serif;font-style:italic;font-size:24px;margin:0 0 16px;">Pedimos <span style="color:#ff6b35;">correcciones</span></h1>
          <p>El admin dejó notas sobre la versión que subiste de <strong>${ctitle}</strong>:</p>
          ${cbody ? `<blockquote style="border-left:3px solid #c8ff00;padding:8px 16px;color:#5a5550;margin:16px 0;">${cbody}</blockquote>` : ""}
          ${button("Ver detalles y subir nueva versión", link)}
        ${FOOTER_HTML}`,
      };
    case "submission_approved":
      return {
        subject: `${ctitle} aprobado!`,
        html: `${HEADER_HTML}
          <h1 style="font-family:Georgia,serif;font-style:italic;font-size:24px;margin:0 0 16px;"><span style="color:#c8ff00;background:#0a0a0a;padding:0 8px;">Aprobado</span></h1>
          <p>Tu trabajo en <strong>${ctitle}</strong> quedó listo. ¡Gracias!</p>
          ${meta.payment ? `<p>El pago de <strong>${meta.payment}</strong> queda pendiente de cobro.</p>` : ""}
          ${button("Ver mis ganancias", link)}
        ${FOOTER_HTML}`,
      };
    case "submission_uploaded":
      return {
        subject: `Nueva versión de ${ctitle}`,
        html: `${HEADER_HTML}
          <h1 style="font-family:Georgia,serif;font-style:italic;font-size:24px;margin:0 0 16px;">Nueva versión</h1>
          <p>El editor subió una nueva versión de <strong>${ctitle}</strong>${meta.version ? ` (v${meta.version})` : ""}.</p>
          ${cbody ? `<blockquote style="border-left:3px solid #c8ff00;padding:8px 16px;color:#5a5550;margin:16px 0;">${cbody}</blockquote>` : ""}
          ${button("Revisar", link)}
        ${FOOTER_HTML}`,
      };
    case "feedback_received":
      return {
        subject: `Nuevo feedback en ${ctitle}`,
        html: `${HEADER_HTML}
          <h1 style="font-family:Georgia,serif;font-style:italic;font-size:24px;margin:0 0 16px;">Nuevo <span style="color:#c8ff00;background:#0a0a0a;padding:0 8px;">feedback</span></h1>
          <p>${meta.from_name ? `<strong>${meta.from_name}</strong>` : "Un asesor"} dejó un comentario en <strong>${ctitle}</strong>:</p>
          ${cbody ? `<blockquote style="border-left:3px solid #c8ff00;padding:8px 16px;color:#5a5550;margin:16px 0;font-style:italic;">${cbody}</blockquote>` : ""}
          ${button("Ver el thread", link)}
        ${FOOTER_HTML}`,
      };
    case "publishing.scheduled":
      return {
        subject: `Publicación programada — ${ctitle}`,
        html: `${HEADER_HTML}
          <h1 style="font-family:Georgia,serif;font-style:italic;font-size:24px;margin:0 0 16px;">Publicación <span style="color:#c8ff00;background:#0a0a0a;padding:0 8px;">programada</span></h1>
          <p>Tu publicación <strong>${ctitle}</strong> quedó programada${meta.scheduled_at ? ` para <strong>${meta.scheduled_at}</strong>` : ""}.</p>
          ${cbody ? `<p style="color:#5a5550;">${cbody}</p>` : ""}
          ${button("Ver detalles", link)}
        ${FOOTER_HTML}`,
      };
    case "publishing.succeeded":
      return {
        subject: `${ctitle} se publicó`,
        html: `${HEADER_HTML}
          <h1 style="font-family:Georgia,serif;font-style:italic;font-size:24px;margin:0 0 16px;"><span style="color:#c8ff00;background:#0a0a0a;padding:0 8px;">Publicado</span></h1>
          <p><strong>${ctitle}</strong> se publicó correctamente.</p>
          ${cbody ? `<p style="color:#5a5550;">${cbody}</p>` : ""}
          ${button("Ver el post", link)}
        ${FOOTER_HTML}`,
      };
    case "publishing.failed":
      return {
        subject: `Falló la publicación de ${ctitle}`,
        html: `${HEADER_HTML}
          <h1 style="font-family:Georgia,serif;font-style:italic;font-size:24px;margin:0 0 16px;">Falló la <span style="color:#ff6b35;">publicación</span></h1>
          <p>Hubo un error publicando <strong>${ctitle}</strong>.</p>
          ${cbody ? `<blockquote style="border-left:3px solid #ff6b35;padding:8px 16px;color:#5a5550;margin:16px 0;">${cbody}</blockquote>` : ""}
          ${button("Reintentar", link)}
        ${FOOTER_HTML}`,
      };
    default:
      return {
        subject: ctitle,
        html: `${HEADER_HTML}
          <h1 style="font-family:Georgia,serif;font-style:italic;font-size:24px;margin:0 0 16px;">${ctitle}</h1>
          ${cbody ? `<p>${cbody}</p>` : ""}
          ${button("Abrir la app", link)}
        ${FOOTER_HTML}`,
      };
  }
}

async function sendResendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY missing; skipping email send");
    return { skipped: true };
  }
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

async function dispatchPush(opts: {
  user_id: string;
  title: string;
  body?: string;
  link?: string;
  dedupe_key?: string;
}): Promise<{ ok: boolean; error?: string; sent?: number; failed?: number; total?: number }> {
  try {
    const url = `${SUPABASE_URL}/functions/v1/send-push`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        user_id: opts.user_id,
        title: opts.title,
        body: opts.body ?? "",
        url: opts.link ?? APP_URL,
        tag: opts.dedupe_key,
      }),
    });
    const payload = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      sent?: number;
      failed?: number;
      total?: number;
      error?: string;
    };
    if (!res.ok) {
      return { ok: false, error: payload.error ?? `send-push status ${res.status}` };
    }
    return {
      ok: true,
      sent: payload.sent,
      failed: payload.failed,
      total: payload.total,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthenticated" }, 401);

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: isAdmin } = await adminClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
    const { data: isEditor } = await adminClient.rpc("has_role", { _user_id: user.id, _role: "editor" });
    const { data: isAdvisor } = await adminClient.rpc("has_role", { _user_id: user.id, _role: "advisor" });

    const body = (await req.json().catch(() => ({}))) as Body;
    if (!body.user_id || !body.kind || !body.title) {
      return json({ error: "user_id, kind and title are required" }, 400);
    }

    // Authorization:
    // - admin: notify anyone
    // - editor / advisor: only self-notify or notify admins
    if (!isAdmin) {
      const hasAnyRole = isEditor || isAdvisor;
      if (!hasAnyRole) return json({ error: "Forbidden" }, 403);
      if (body.user_id !== user.id) {
        const { data: recipientIsAdmin } = await adminClient.rpc("has_role", { _user_id: body.user_id, _role: "admin" });
        if (!recipientIsAdmin) return json({ error: "Forbidden — cannot notify this user" }, 403);
      }
    }

    // Insert notification (idempotent via dedupe_key unique index)
    const insertRes = await adminClient
      .from("notifications")
      .insert({
        user_id: body.user_id,
        kind: body.kind,
        title: body.title,
        body: body.body ?? null,
        link: body.link ?? null,
        dedupe_key: body.dedupe_key ?? null,
      })
      .select()
      .maybeSingle();

    if (insertRes.error && !/duplicate|unique/i.test(insertRes.error.message)) {
      return json({ error: insertRes.error.message }, 500);
    }
    const notificationId = insertRes.data?.id ?? null;

    let emailResult: { sent: boolean; error?: string } | null = null;
    let pushResult: { sent: boolean; error?: string; counts?: { sent?: number; failed?: number; total?: number } } | null = null;

    // Email (optional, defaults to false)
    if (body.send_email) {
      const { data: profile, error: pErr } = await adminClient
        .from("profiles")
        .select("email")
        .eq("id", body.user_id)
        .maybeSingle();
      if (pErr || !profile?.email) {
        emailResult = { sent: false, error: "profile not found" };
      } else {
        const tpl = renderTemplate(body.kind, {
          title: body.title,
          body: body.body,
          link: body.link ?? APP_URL,
          meta: body.meta,
        });
        try {
          await sendResendEmail(profile.email, tpl.subject, tpl.html);
          emailResult = { sent: true };
        } catch (err) {
          emailResult = { sent: false, error: err instanceof Error ? err.message : String(err) };
        }
      }
    }

    // Push (defaults to ON; pass send_push: false to opt out)
    const wantsPush = body.send_push !== false;
    if (wantsPush) {
      const r = await dispatchPush({
        user_id: body.user_id,
        title: body.title,
        body: body.body,
        link: body.link,
        dedupe_key: body.dedupe_key,
      });
      pushResult = r.ok
        ? { sent: true, counts: { sent: r.sent, failed: r.failed, total: r.total } }
        : { sent: false, error: r.error };
    }

    return json({
      ok: true,
      notification_id: notificationId,
      email: emailResult,
      push: pushResult,
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
