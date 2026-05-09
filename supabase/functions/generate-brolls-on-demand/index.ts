// generate-brolls-on-demand — fork del flujo viejo de brolls.
// Antes vivía dentro de generate-script y se ejecutaba en cada generación de
// guion. Ahora generate-script emite Animations (motion graphics) y las brolls
// AI tipo NanoBanana/Kling se generan SOLO cuando el admin las pide explícito
// con el botón "Crear Brolls" en el ScriptEditor.
//
// Input:  { script_id }
// Output: { ok, broll_count }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const CLAUDE_MODEL = "claude-sonnet-4-6";
const CLAUDE_MAX_TOKENS = 1500;

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

const SYSTEM_PROMPT = `Sos el broll-director de Ezequiel Lamas (@ezequiellamass).

Tu trabajo: dado un guion completo (hook + development + cta), proponer 3-5
B-rolls visuales CONCRETOS y EJECUTABLES atados a líneas específicas del guion.

Cada B-roll será renderizado por un pipeline de IA (NanoBanana → Kling) que
genera imagen + animación a partir de tu descripción. Por eso necesitamos:
- Un cue_text exacto del guion donde el B-roll arranca (palabras textuales).
- Una suggestion VISUAL clara (qué se ve, dónde, con qué luz/encuadre).

Reglas:
- Voz argentina técnica (mirá / dejá / construilo / hacés).
- NO em-dashes. NO emojis. NO frases vacías ("imagen del éxito", "metáfora del futuro").
- Concretos: "Laptop con dashboard de Stripe mostrando $30K MRR" > "imagen de plata".
- Si el guion menciona un número, herramienta o concepto físico → mostralo.
- Si el guion es abstracto (manifiesto, opinión) → metáfora visual concreta y simple.
- 3-5 B-rolls total. Distribuidos a lo largo del guion (no todos al inicio).

Devolvés SIEMPRE el resultado vía la tool 'submit_brolls'.`;

const SUBMIT_BROLLS_TOOL = {
  name: "submit_brolls",
  description: "Devuelve 3-5 sugerencias de B-roll para el guion dado.",
  input_schema: {
    type: "object",
    properties: {
      brolls: {
        type: "array",
        items: {
          type: "object",
          properties: {
            position: {
              type: "integer",
              minimum: 0,
              description: "Orden cronológico (0, 1, 2, ...).",
            },
            cue_text: {
              type: "string",
              description: "Frase exacta del guion donde el B-roll arranca.",
            },
            suggestion: {
              type: "string",
              description:
                "Descripción visual concreta y ejecutable. Lo que ve el espectador.",
            },
          },
          required: ["position", "cue_text", "suggestion"],
        },
        minItems: 3,
        maxItems: 5,
      },
    },
    required: ["brolls"],
  },
} as const;

interface BrollItem {
  position: number;
  cue_text: string;
  suggestion: string;
}

interface ClaudeBrollsResult {
  brolls: BrollItem[];
}

async function callClaude(userText: string): Promise<ClaudeBrollsResult> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: CLAUDE_MAX_TOKENS,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: userText }],
      tools: [SUBMIT_BROLLS_TOOL],
      tool_choice: { type: "tool", name: "submit_brolls" },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API ${res.status}: ${errText.slice(0, 800)}`);
  }
  const data = (await res.json()) as {
    content: Array<{ type: string; name?: string; input?: ClaudeBrollsResult }>;
  };
  const block = (data.content ?? []).find(
    (b) => b.type === "tool_use" && b.name === "submit_brolls",
  );
  if (!block?.input) throw new Error("Claude did not return submit_brolls tool_use");
  return block.input;
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

    const body = await req.json().catch(() => ({}));
    const script_id = typeof body?.script_id === "string" ? body.script_id : null;
    if (!script_id) return json({ error: "script_id required" }, 400);

    // RLS valida ownership al hacer el SELECT.
    const { data: script, error: sErr } = await userClient
      .from("scripts")
      .select("id, hook, development, cta, generated_script, content_bucket, avatar_target")
      .eq("id", script_id)
      .single();
    if (sErr || !script) {
      return json({ error: sErr?.message ?? "script not found" }, 404);
    }

    const scriptText = script.generated_script
      || [script.hook, script.development, script.cta].filter(Boolean).join("\n\n");
    if (!scriptText.trim()) {
      return json({ error: "script has no generated text" }, 422);
    }

    const userPrompt = [
      `=== GUION ===`,
      scriptText,
      "",
      script.content_bucket ? `Bucket: ${script.content_bucket}` : "",
      script.avatar_target ? `Avatar: ${script.avatar_target}` : "",
      "",
      "Generá 3-5 B-rolls visuales concretos atados a líneas específicas del guion.",
      "Llamá a submit_brolls con el resultado.",
    ]
      .filter(Boolean)
      .join("\n");

    const result = await callClaude(userPrompt);
    const brolls = (result.brolls ?? []).map((b, i) => ({
      position: typeof b.position === "number" ? b.position : i,
      cue_text: b.cue_text ?? null,
      suggestion: b.suggestion,
    }));

    if (brolls.length === 0) {
      return json({ ok: true, script_id, broll_count: 0 });
    }

    const { data: insertedCount, error: rpcErr } = await userClient.rpc(
      "insert_brolls_for_script",
      { _script_id: script_id, _brolls: brolls },
    );
    if (rpcErr) return json({ error: `RPC failed: ${rpcErr.message}` }, 500);

    return json({
      ok: true,
      script_id,
      broll_count: typeof insertedCount === "number" ? insertedCount : brolls.length,
    });
  } catch (err) {
    return json({ error: String(err instanceof Error ? err.message : err) }, 500);
  }
});
