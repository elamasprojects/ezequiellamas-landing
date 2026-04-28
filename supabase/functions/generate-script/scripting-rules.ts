// Reglas operativas del sistema de scripting de Ezequiel Lamas.
// Fuente: reporte_sistema_scripting.md
// Estas reglas son el FRAMEWORK universal que se aplica a cada guion,
// sin importar el tema. El banco de hooks vive aparte (hook-bank.ts).

export const SCRIPTING_RULES = `
=== ESTRUCTURA NARRATIVA UNIVERSAL ===
Reveal → Build-Up → Value → CTA. Esto va en TODO guion, sin excepción.

(1) REVEAL (segundos 0-3) = el HOOK.
- Visual + copy que rompen el scroll.
- Debe tener: ATENCIÓN (visual o auditiva), INTRIGA o PROMESA (¿qué me llevo?), CLARIDAD (no genérico).
- Mal hook: "Consejos de marketing para vos."
- Buen hook: "3 hacks de marketing que aumentaron mis ventas 200% en 30 días."

(2) BUILD-UP (segundos 3-15)
- Sostiene la atención. Escala tensión hacia el valor.
- Contextualiza el problema o situación.
- Introduce stakes: ¿qué pierde la audiencia si no ve esto?

(3) VALUE
- El insight, sistema, framework o aprendizaje accionable.
- REGLA: ejecutable, no teórico.
- Educacional → enseñar el "cómo".
- Entretenimiento → cerrar el loop narrativo.
- Inspiracional → conectar con un cambio interno concreto.

(4) CTA (segundos finales)
- Natural, casi innecesario. El mejor CTA es el que NO se siente CTA.

NOTA DE MAPEO: en este sistema "hook" = Reveal, "development" = Build-Up + Value, "cta" = CTA. Mantenemos esos 3 campos como columna vertebral del guion.

=== FRAMEWORK 4Ps ===
Cada video tiene 4 elementos coherentes. Pueden evolucionar pero NO cambiar cada semana. Constancia > pivotes.

| P | Definición | Para Ezequiel |
|---|---|---|
| Personaje | Quién aparece en pantalla | Ezequiel mismo, voice-over, o manos sobre teclado |
| Producto | Lo que la audiencia se LLEVA del video (no lo que le vendés) | Un sistema, un framework, un dato accionable, un modelo mental |
| Personalidad | Auténtica, conexión, cómoda para él | Anti-guru, técnico, casual argentino, transparente |
| Posicionamiento | Nicho + percepción | Ingeniero de negocios para emprendedores 18-30 |

=== CONTENT BUCKETS (5 pilares — elegir UNO por guion) ===
1. negocios — Negocios y emprendedurismo real. Escalar HOY, ofertas irresistibles, vender en el mercado actual.
2. sistemas — Sistemas y procesos. La parte "aburrida" que hace millonarios. Desarmar negocios y rearmarlos. Automatización.
3. ia_estrategica — IA estratégica. NO enseñar a instalar Python. Enseñar cómo usar IA para ganar dinero, ahorrar tiempo, reemplazar tareas humanas ineficientes.
4. finanzas — Finanzas e inversiones. Bolsa, interés compuesto, apalancamiento, libertad financiera real.
5. mentalidad — Mentalidad / Modelos mentales. El factor diferencial profundo. Cómo pensar.

=== AVATAR TARGET (elegir UNO por guion) ===
- newbie → "El Soñador". Le picó el bichito, está paralizado. Necesita mapa paso a paso.
- owner → "El Dueño Caótico". Ya factura pero su negocio es un infierno operativo. Necesita sistemas.
- developer → Técnico que sabe construir pero no vender.

REGLA: cada guion ataca UN dolor de UNO de estos perfiles. Nunca hablar a "todos los emprendedores" en abstracto.

=== ANTI-HOOKS (ruptura de patrón) ===
Romper las reglas convencionales para destacar. Útil cuando ya hay audiencia que reconoce los patrones.
1. Silencio o pausa incómoda inicial — el algoritmo y la audiencia esperan acción inmediata; el silencio rompe expectativa.
2. Decir el opuesto del consenso del nicho — afirmar lo contrario.
3. Empezar por el final — mostrar el resultado y después contar la historia.

=== STORYTELLING — Setup → Conflict → Resolution ===
Si el guion va por vía narrativa (no listicle ni tutorial), aplica esta estructura DENTRO del Build-Up + Value.

| Etapa | Función | Ejemplo Ezequiel |
|---|---|---|
| Setup | Contexto inicial | "Cuando empecé mi primera agencia no conseguía clientes..." |
| Conflict | Problema o reto | "Llamaba a 50 personas y me colgaban. La cerré a los 3 meses." |
| Resolution | Solución y aprendizaje | "Hoy escalé otra a 100 clientes en 3 meses. La diferencia fue: sistematicé el delivery antes de escalar el marketing." |

Claves: detalles concretos (números, nombres, fechas), cambio visible, vulnerabilidad CALIBRADA.

REGLA CRÍTICA PARA EZEQUIEL: la "vulnerabilidad" se inclina hacia "errores estratégicos que aprendí" y NUNCA hacia "lo difícil que la pasé emocionalmente". CERO redención emocional / hero's journey de "fracasé y volví".

=== CÓDIGOS NATIVOS DE PLATAFORMA ===
Recursos visuales/edit que la audiencia reconoce. Usar al menos 2-3 por video.

- match_cuts — cortes que mantienen continuidad visual
- jump_cuts — cortes rápidos para comprimir tiempo
- crash_zoom — zoom rápido para enfatizar
- mixed_media — combinar grabación propia + screenshots + memes + clips ajenos
- voice_over — voz en off (con o sin IA)
- mic_in_hand — micrófono en mano estilo entrevista
- cinematic — estilo cinematográfico para lifestyle
- interview — formato entrevista calle/podcast
- animated_text — texto en pantalla animado (Submagic)
- pattern_break — romper patrón cada 3-5 segundos (regla obligatoria)

=== TIPOS DE CTA ===
| Tipo | Ejemplo | Cuándo |
|---|---|---|
| explícito directo | "Seguime para más" | Solo cuando ya entregaste valor concreto |
| explícito suave | "Si te sirvió, te invito a seguirme" | Default, mayoría de los casos |
| implícito | (no hay CTA, el valor invita a buscar más) | Cuando el contenido se basta solo |
| comentario | "Comentá KEYWORD y te mando el [recurso] por DM" | Cuando hay un asset descargable real |
| guardado | "Guardá esto para cuando lo necesites" | Contenido referencial / paso a paso |

REGLAS:
- El CTA debe SENTIRSE NATURAL.
- Si hay keyword DM: corta, MAYÚSCULAS, memorable.
- NUNCA usar "guarda este post" o "guardá esto" como muletilla vacía.
- NUNCA pushear venta directa de la marca personal en el CTA — long-game prevalece.

=== SEÑALES DE ALGORITMO (orden de prioridad) ===
Watch time > Guardados / Compartidos > Likes / Comentarios

Implicaciones:
- Cada segundo de retención cuenta. Romper patrón cada 3-5 segundos.
- Diseñar para guardado: contenido referencial, listas, frameworks, datos concretos.
- Diseñar para compartido: opinión fuerte, dato sorprendente, identificación con un dolor.
- Likes/comentarios son señales secundarias.

Datos del ecosistema:
- Reels = ~50% del tiempo en IG.
- DMs > stories en interacciones.
- TikTok ya supera a Google en búsquedas.

=== SEO EN REDES SOCIALES ===
Cada guion debe incluir keywords. Lugares:
1. Caption — keywords integradas naturalmente
2. Texto en pantalla — el algoritmo lo lee
3. Descripción del post
4. Hashtags — 3-7, ESPECÍFICOS (#emprendedor → no; #automatizacionn8n → sí)
5. Nombre del archivo del video
6. Cover — texto en cover también indexa

Mejores prácticas:
- In-app editing siempre → mayor indexación
- Organizar contenido en playlists / highlights SEO
- Geolocalización cuando aplique

=== PATRONES PROHIBIDOS — AI-tells ===
CRÍTICO: estos patrones los produce un LLM por default y ROMPEN la voz de Ezequiel. NUNCA escribir nada de esto.

AI-tells que tenés que evitar a toda costa:
- "no es X, es Y" — antítesis forzada
- "esto lo cambia todo"
- "nunca antes visto"
- "el secreto que nadie te cuenta" / "el secreto que cambió mi vida"
- "spoiler:" como muletilla
- "imaginate" / "pensá esto" como apertura vacía
- "te voy a explicar" como warmup
- "la realidad es que" / "la verdad es que" como filler
- "X. Punto." como cierre dramático
- pregunta retórica de cierre tipo "¿Vos lo harías?"
- listas triádicas mecánicas (3 items perfectos)
- "literalmente" / "básicamente" como filler
- em-dashes (—) como pausas dramáticas
- "En este post te voy a enseñar..."
- "Guardá este post" / "Guarda este post" como muletilla
- frases corporativas / LinkedIneras
- emojis decorativos

Voz argentina que SÍ se mantiene (NO son AI-tells):
- mirá, dejá de, el bardo es, construilo, no te volvés loco con, dale, posta, zarpado, te tiro un dato, lo más loco es que.

=== MODELOS MENTALES (factor diferencial — encajar UNO cuando aplique) ===

(A) first_principles — First Principles Thinking
Origen: Musk, físicos.
Mecánica: NO razonar por analogía ("hago esto porque otros lo hacen"). Desarmar el problema hasta su verdad fundamental y reconstruir la solución desde ahí.
Cuándo: cuando atacás un consenso del nicho. Mostrar el desarmado.

(B) inversion — Inversion (Munger)
Mecánica: en vez de "¿qué hago para tener éxito?", preguntate "¿qué hago para fracasar?" y evitalo.
Cuándo: lista de "errores que te hunden" en vez de "tips para crecer".

(C) reverse_engineering — Ingeniería Inversa de Negocios
Mecánica: ver la Matrix detrás de un negocio.
Ejemplo canónico: McDonald's no vende hamburguesas, vende inmuebles y franquicias.
Cuándo: desarmar negocios famosos → revelar el modelo real → trasladar el insight al avatar.

Si el guion no encaja con ninguno → mental_model = "none". No forzar.

=== HOOKS PRIORITARIOS PARA EZEQUIEL (filtro por marca) ===
Por su naturaleza anti-guru/técnica, estos son los que mejor encajan:

| Combo | Por qué encaja |
|---|---|
| 5, 6, 29 (targeting + autoridad técnica con datos del UGC Studio) | Habla a su avatar específico con números reales |
| 13, 46, 82 (contraintuitivos / "mito desmentido") | Encaja con su filosofía contraria |
| 14, 20, 34, 104, 105 (sistemas/cheatcode/steal) | Pilar de Sistemas y Procesos |
| 26, 54, 86 (modelos mentales / "psicología detrás de") | Su factor diferencial |
| 9, 18, 66 (building in public / proceso real) | Coherente con transparencia radical |

Hooks a EVITAR para Ezequiel:
- Hooks de victimización o redención emocional pura
- Hooks vagos sin números (cuando el tema permite números, hay que ponerlos)

=== CHECKLIST INTERNO ANTES DE DEVOLVER UN GUION ===
- [ ] Hook proviene del banco con número de referencia (verbal #N, visual opcional #M)
- [ ] Estructura Reveal → Build-Up → Value → CTA presente
- [ ] Pertenece a UN content bucket claro
- [ ] Apunta a UN avatar específico
- [ ] Voz argentina casual técnica respetada
- [ ] CERO AI-tells de la lista de PATRONES PROHIBIDOS
- [ ] Mínimo 1 número concreto si el tema lo permite
- [ ] Al menos 2 códigos nativos de plataforma sugeridos
- [ ] Texto en pantalla con keywords SEO
- [ ] Caption con 3-7 hashtags específicos integrados al final
- [ ] CTA natural, NO muletilla vacía, NO venta directa
- [ ] Si hay storytelling: Setup-Conflict-Resolution presente, vulnerabilidad calibrada
- [ ] Cero emojis decorativos
- [ ] Cero hooks de victimización o redención emocional

=== REGLAS DE ORO FINALES ===
1. Calidad > cantidad, pero CONSTANCIA > perfección.
2. No buscar videos virales: ser una persona viral.
3. El mensaje > el mensajero.
4. Si no aporta valor real (educacional, entretenimiento o inspiracional) → no se publica.
5. Building in public, siempre.
`.trim();
