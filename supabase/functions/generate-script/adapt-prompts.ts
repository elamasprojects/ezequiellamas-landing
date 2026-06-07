// (M23) Default instruction blocks for the three "Crear a partir de ideas"
// adaptation modes. These are the fallbacks when the owner has no
// `prompt_overrides` row for the slug. Served to the client by
// `get-prompt-defaults` so the Prompts IA tab shows the real text.
//
// Each block is injected into the reference section of the user prompt and
// tells the model HOW to transform the source idea(s).

export const ADAPT_COPY_DEFAULT = `MODO: Copiar.
- Replicá la IDEA, el ángulo y la estructura del/los video(s) referencia lo más fielmente posible.
- Traducí a español rioplatense limpio; sacá muletillas y relleno; NO cambies el enfoque ni el tema.
- Mantené el tipo de hook y el orden de los puntos. Es una réplica fiel, no una reinterpretación.
- Igual aplicá el manifiesto + reglas de scripting para que no tenga AI-tells y suene natural.`;

export const ADAPT_VOICE_DEFAULT = `MODO: A mi voz.
- Usá el/los video(s) como SEMILLA de contenido. Reescribí TODO con la voz, el POV y los ejemplos del creator (ver PERFIL DEL CREATOR si está presente).
- El tema puede ser análogo, pero la bajada, los ejemplos y la postura son 100% del creator.
- Usá el hook del original como inspiración del TIPO de apertura, re-escrito para el avatar del creator.
- NUNCA copies frases literales de la transcripción.`;

export const ADAPT_INSTRUCTIONS_DEFAULT = `MODO: Con instrucciones.
- Adaptá el/los video(s) siguiendo EXACTAMENTE las instrucciones del usuario (las vas a ver en el CONCEPTO DEL USUARIO).
- Las instrucciones mandan sobre el contenido original: si piden cambiar enfoque, nicho o punto de vista, hacelo.
- Mantené la voz del creator y el manifiesto + reglas de scripting.`;

export const ADAPT_PROMPT_DEFAULTS: Record<string, string> = {
  "adapt.copy": ADAPT_COPY_DEFAULT,
  "adapt.voice": ADAPT_VOICE_DEFAULT,
  "adapt.instructions": ADAPT_INSTRUCTIONS_DEFAULT,
};

export type AdaptMode = "copy" | "voice" | "instructions";

export function adaptSlug(mode: AdaptMode): string {
  return `adapt.${mode}`;
}
