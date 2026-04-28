import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const APP_URL = Deno.env.get("APP_URL") ?? "https://ezequiellamas.com";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "Ezequiel Lamas <hola@updates.ezequiellamas.com>";

const DEFAULT_PASSWORD = "123456";

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

function renderAccessEmail(opts: { email: string; password: string; loginUrl: string }) {
  const subject = "Tus accesos a Ezequiel Lamas";
  const html = `<div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0a0a0a;background:#ffffff;">
    <div style="text-align:left;margin-bottom:24px;">
      <span style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;color:#5a5550;">Bienvenido</span>
    </div>
    <h1 style="font-family:Georgia,serif;font-style:italic;font-size:28px;line-height:1.1;margin:0 0 24px;">Tus <span style="color:#0a0a0a;background:#c8ff00;padding:0 8px;">accesos</span> a la app</h1>

    <p style="margin:0 0 16px;color:#0a0a0a;">Te creamos un usuario en <strong>ezequiellamas.com</strong>. Estos son tus datos de acceso:</p>

    <div style="border:1px solid #e5e5e5;border-radius:8px;padding:16px 20px;margin:24px 0;background:#fafafa;">
      <p style="margin:0 0 8px;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#8a8580;">Email</p>
      <p style="margin:0 0 16px;font-family:'JetBrains Mono',monospace;font-size:14px;"><strong>${opts.email}</strong></p>
      <p style="margin:0 0 8px;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#8a8580;">Contraseña</p>
      <p style="margin:0;font-family:'JetBrains Mono',monospace;font-size:14px;"><strong>${opts.password}</strong></p>
    </div>

    <p style="margin:24px 0 12px;"><a href="${opts.loginUrl}" style="display:inline-block;background:#c8ff00;color:#0a0a0a;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Entrar a la app</a></p>
    <p style="margin:0 0 24px;font-size:13px;color:#5a5550;">O copiá este link: <a href="${opts.loginUrl}" style="color:#0a0a0a;">${opts.loginUrl}</a></p>

    <hr style="border:none;border-top:1px solid #e5e5e5;margin:32px 0;" />

    <h2 style="font-family:Georgia,serif;font-style:italic;font-size:20px;margin:0 0 12px;">Instalá la app en tu <span style="color:#ff6b35;">teléfono</span></h2>
    <p style="margin:0 0 16px;color:#0a0a0a;">La app funciona como app nativa en tu cel. Para instalarla:</p>
    <ol style="margin:0 0 16px;padding-left:20px;color:#0a0a0a;">
      <li style="margin-bottom:8px;">Abrí <strong>${opts.loginUrl}</strong> en el navegador del teléfono (Safari en iPhone, Chrome en Android).</li>
      <li style="margin-bottom:8px;"><strong>iPhone:</strong> tocar el botón compartir <span style="font-size:14px;">↑</span> y elegir <em>"Agregar a pantalla de inicio"</em>.</li>
      <li style="margin-bottom:8px;"><strong>Android:</strong> tocar el menú <span style="font-size:16px;">⋮</span> y elegir <em>"Instalar app"</em> o <em>"Agregar a pantalla principal"</em>.</li>
      <li>Logueáte con el email y contraseña de arriba.</li>
    </ol>
    <p style="margin:0 0 16px;font-size:13px;color:#5a5550;">Una vez instalada, vas a abrirla con un toque desde tu pantalla de inicio, igual que cualquier app.</p>

    <p style="margin-top:40px;color:#8a8580;font-size:12px;">Ezequiel Lamas · ezequiellamas.com</p>
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthenticated" }, 401);

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: isAdmin } = await adminClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden — admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const target_user_id = typeof body?.user_id === "string" ? body.user_id : null;
    if (!target_user_id) return json({ error: "user_id required" }, 400);

    const { data: profile, error: pErr } = await adminClient
      .from("profiles")
      .select("email")
      .eq("id", target_user_id)
      .maybeSingle();
    if (pErr || !profile?.email) {
      return json({ error: pErr?.message ?? "Profile not found for that user" }, 404);
    }

    const loginUrl = `${APP_URL}/login`;
    const tpl = renderAccessEmail({ email: profile.email, password: DEFAULT_PASSWORD, loginUrl });

    try {
      const result = await sendResendEmail(profile.email, tpl.subject, tpl.html);
      return json({ ok: true, sent_to: profile.email, resend_id: (result as { id?: string }).id ?? null });
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : String(err) }, 502);
    }
  } catch (err) {
    return json({ error: String(err instanceof Error ? err.message : err) }, 500);
  }
});
