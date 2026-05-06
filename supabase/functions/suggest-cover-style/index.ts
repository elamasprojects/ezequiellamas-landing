// supabase/functions/suggest-cover-style/index.ts
//
// Analiza la transcripción/guión de una portada y sugiere qué estilo aplicar.
// Usa Claude para matchear el contenido contra los estilos disponibles del admin.
//
// Body: { cover_id: string }
// Returns: { suggested_style_id: string, reasoning: string }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  if (!ANTHROPIC_API_KEY) return json({ error: "missing_anthropic_key" }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401);

  const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userResult, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userResult.user) return json({ error: "unauthorized" }, 401);
  const userId = userResult.user.id;

  let body: { cover_id: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const { cover_id } = body;
  if (!cover_id) return json({ error: "cover_id_required" }, 400);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Cargar cover con script/video
  const { data: cover } = await admin
    .from("covers")
    .select("script_id, video_id, title")
    .eq("id", cover_id)
    .eq("owner_id", userId)
    .single();

  if (!cover) return json({ error: "cover_not_found" }, 404);

  // Cargar estilos disponibles
  const { data: styles } = await admin
    .from("cover_styles")
    .select("id, name, description, when_to_use")
    .eq("owner_id", userId)
    .order("position");

  if (!styles || styles.length === 0) return json({ error: "no_styles_available" }, 400);

  // Cargar contenido
  let content = "";
  if (cover.script_id) {
    const { data: script } = await admin
      .from("scripts")
      .select("hook, generated_script")
      .eq("id", cover.script_id)
      .single();
    if (script) {
      content = [script.hook, script.generated_script].filter(Boolean).join("\n\n");
    }
  }
  if (!content && cover.video_id) {
    const { data: video } = await admin
      .from("videos")
      .select("transcript")
      .eq("id", cover.video_id)
      .single();
    if (video?.transcript) content = video.transcript;
  }
  if (!content) return json({ error: "no_content_to_analyze" }, 400);

  // Construir lista de estilos para el prompt
  const stylesDesc = styles
    .map((s, i) => `${i + 1}. ID: ${s.id}\n   Nombre: ${s.name}\n   Descripción: ${s.description ?? ""}\n   Cuándo usarlo: ${s.when_to_use ?? ""}`)
    .join("\n\n");

  const systemPrompt = `Sos un experto en diseño de portadas para videos cortos de redes sociales.
Tu tarea: analizar el contenido de un video y elegir el mejor estilo de portada de una lista.

Respondé SOLO con JSON sin ningún otro texto:
{ "suggested_style_id": "<id del estilo elegido>", "reasoning": "<1 oración explicando por qué>" }`;

  const userMessage = `Contenido del video:
${content.slice(0, 2000)}

Estilos disponibles:
${stylesDesc}

¿Qué estilo es el más apropiado para este video?`;

  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!claudeRes.ok) {
    const detail = await claudeRes.text();
    return json({ error: `claude_${claudeRes.status}`, detail: detail.slice(0, 300) }, 502);
  }

  const claudeData = await claudeRes.json();
  const text = (claudeData.content?.[0]?.text ?? "") as string;

  let suggestedStyleId = "";
  let reasoning = "";
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      suggestedStyleId = parsed.suggested_style_id ?? "";
      reasoning = parsed.reasoning ?? "";
    }
  } catch {
    // fallback: primer estilo
    suggestedStyleId = styles[0].id;
    reasoning = "Selección por defecto.";
  }

  // Validar que el ID existe en los estilos disponibles
  const validStyle = styles.find((s) => s.id === suggestedStyleId);
  if (!validStyle) {
    suggestedStyleId = styles[0].id;
    reasoning = "Selección por defecto.";
  }

  // Guardar sugerencia en la fila
  await admin.from("covers").update({ suggested_style_id: suggestedStyleId }).eq("id", cover_id);

  return json({ suggested_style_id: suggestedStyleId, reasoning });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
