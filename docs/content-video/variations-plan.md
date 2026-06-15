# Plan — Dos variaciones nuevas del video "Content Center"

Dos variaciones nuevas además de la **kinetic** ya en producción. Cada una explora un
eje distinto pero comparte el branding, el VO (voz "Ezequiel"), y los guardrails
técnicos de HyperFrames. Se sirven en `/content-center/demo/presentation-video` (la
página pasa a ser una galería de 3: Kinetic · Cursor-flow · Captions).

- **Variación A — "Cursor-flow / App en movimiento"**: elementos grandes, iconos,
  screenshots de la app moviéndose (device mocks animados), un cursor que hace click en
  botones (con SFX + reacción del botón + transición). Poco número/texto chico.
- **Variación B — "Captions / Karaoke"**: subtítulos sincronizados al VO — karaoke
  palabra-por-palabra en los momentos clave + captions completos (4-5 palabras) en
  otros, combinando Poppins (geométrica) + Caveat (manuscrita que "se escribe"), con
  highlight de la palabra hablada.

Fuentes de verdad: el VO `vo.mp3` (voz `ralfni8BZcLXadJWxyYJ`, 19.55s) y su **tabla de
tiempos por palabra** (abajo). Convenciones y bugs conocidos: [`README.md`](./README.md)
+ [`ERRORS.md`](./ERRORS.md).

---

## PARTE 1 — Guidelines (aplican a las DOS variaciones)

### 1.1 Dopamina / ritmo (lo más importante)
- **Nada estático más de ~0.5–1s.** Siempre hay algo animándose: un scroll, un count-up,
  un cursor moviéndose, un icono que entra, una palabra que cambia, un glow que respira,
  un parallax. El ojo nunca descansa.
- Cada "sentence" del VO dura ~2.5–3.5s → se subdivide en **3–6 micro-beats** encadenados
  (no una sola animación de entrada y luego quieto). Capas de movimiento solapadas.
- **Ir al límite**: máxima cantidad de efectos/animaciones que entren sin romper la
  legibilidad. Varias pasadas de pulido (ver §1.6 QA).
- Escenas más cortas / cortes más frecuentes que la kinetic.

### 1.2 Branding
- Tokens: bg `#0a0a0a`, surface `#111`, accent neón `#c8ff00`, warm `#ff6b35`, blue
  `#4a9eff`, IG `#d946ef`, YT `#ef4444`, TT `#06b6d4`, text `#e8e4de`, muted `#8a8580`.
- Fuentes existentes: **Instrument Serif** (display/italic), **DM Sans** (body),
  **JetBrains Mono** (labels). **Nuevas** (vía `@font-face` local, `font-display:block`):
  **Poppins 600/700** (headlines kinéticos) y **Caveat 600** (acento manuscrito).
- Logos reales IG/YT/TT (SVG inline, paths ya en el repo de la kinetic).

### 1.3 Audio (reusar)
- **VO**: `vo.mp3` (voz Ezequiel). Las dos variaciones lo comparten → mismo timing base.
- **Música**: `music.mp3` bed a `data-volume 0.15`.
- **SFX sintetizados con ffmpeg, NUNCA IA** (la IA mete clang metálico — ERRORS §1):
  `whoosh.mp3` (transiciones, ~0.38), **`click.wav`** (cursor click, var A) y `tick.wav`
  (hover/acentos). Comandos en §A.4 / §B.4.
- Cada `<audio>` con `id` único (si no → muteado, ERRORS §7). Tracks: 1 música · 2 VO ·
  3 whoosh · 4 click/tick.

### 1.4 Guardrails técnicos (no negociables — de ERRORS/README)
1. **Modelo de escenas persistentes** (no clips con data-start/duration que se pisan).
2. **Entradas transform-only** en escenas que llegan por slide (sin `opacity:0`) → nunca
   panel negro vacío. Solo el opener puede aparecer desde negro.
3. **Mismo ease** para in & out de cada transición (`power3.inOut`) → cero hueco.
4. **Reveal con `tl.set(scene,{opacity:1}, T)`**, nunca `immediateRender:false`/`fromTo`
   para el reveal (→ frames negros en el seek del render).
5. **Nada de flips 180°** (blink edge-on). Rotaciones ≤ ~20°.
6. **Determinista / seek-safe**: sin `Math.random`/`Date.now`, sin `repeat:-1`. El render
   hace `tl.seek(t)` por frame → todo es función pura de `t`. Captions: spans
   pre-renderizados + `tl.set` de opacity (swap instantáneo), kill duro al final.
7. **`@font-face` con nombres literales** (no `var()`), woff2 latin local.
8. **Un solo `index.html`** con `data-composition-id` por proyecto. `lint`/`inspect` solo
   leen `index.html`; `render -c` para variantes.
9. **Verificación**: `lint` (0 errores) → `inspect` → `render` → **extraer frames con
   ffmpeg y mirarlos**, incluí mid-transición (`corte±0.1/0.2`) para cazar jank.

### 1.5 Timing del VO (tabla de cortes — compartida)
Frases (sentence-start = anclas de escena). El corte de escena va ~0.25–0.35s **antes**
del start de la frase para que el slide/whoosh aterrice justo cuando arranca la frase.

| Escena | Frase (VO) | start frase | corte (escena) |
|---|---|---|---|
| 1 Intro | "Esto es Content Center. El estudio donde corro toda mi marca." | 0.00 | 0.0 |
| 2 Dashboard | "Tus métricas de todas las plataformas, en una sola pantalla." | 3.61 | ~3.31 |
| 3 Guiones IA | "De una idea a un guion listo, con IA." | 6.57 | ~6.27 |
| 4 Publicación | "Publicás en Instagram, YouTube y TikTok a la vez." | 9.61 | ~9.31 |
| 5 Predicción | "Y sabés si un video va a explotar antes de subirlo." | 12.98 | ~12.68 |
| 6 Resumen→CTA | "Todo tu contenido, en un solo lugar. Sumate a la lista." | 15.82 / 18.26 | ~15.52 |

Word-level (62 palabras) — usado para captions y para anclar micro-beats. Palabras clave
y su `start`: `Content`=0.70 · `Center`=1.09 · `métricas`=3.81 · `plataformas`=4.61 ·
`pantalla`=5.96 · `idea`=6.90 · `guion`=7.57 · `IA`(I=8.87,A=9.11) · `Instagram`=10.26 ·
`YouTube`=10.87 · `TikTok`=11.51 · `vez`=12.40 · `explotar`=13.91 · `subirlo`=14.99 ·
`contenido`=16.30 · `lugar`=17.51 · `Sumate`=18.26 · `lista`=18.89. (Tabla completa en el
output de research / re-derivable de `vo-ts.json`.)

### 1.6 QA / "varias vueltas" (Ultracode)
Después de cada render: extraer ~12 frames (holds + mid-transiciones) y, vía un workflow
de crítica, hacer que 2–3 agentes revisen los frames buscando: momentos estáticos >0.5s,
jank 3D, huecos, captions ilegibles/solapados, overflow. Aplicar fixes → re-render →
repetir hasta que esté pulido. Mínimo 2 pasadas por variación.

---

## PARTE 2 — Variación A: "Cursor-flow / App en movimiento"

**Concepto:** se siente como un screencast premium del producto. Elementos GRANDES,
iconos, y mockups de la app (browser/phone) que se scrollean/zoomean. Un cursor neón
recorre la pantalla, hace click en botones (con `click.wav` + reacción del botón) y eso
**dispara** la siguiente acción/transición. Casi sin números chicos: protagonizan los
iconos grandes, los device-mocks en movimiento y el cursor.

### 2.1 Técnicas núcleo (de research)
- **Device mocks** (research §4): `.device--browser` (barra + dots + url) y `.device--phone`
  (notch), con `.app-screen` adentro recreando las pantallas reales (dashboard/guiones/
  publicación) — reuso de los paneles HTML que ya construí. Animados con: auto-scroll
  vertical, **parallax** (2 capas a distinta velocidad), **zoom-in a un detalle** (con
  focus-ring neón), y entrada con scale + tilt 3D.
- **Cursor-click** (research §2): SVG arrow neón → viaja al botón → press (scale↓↑) →
  **ripple ring** + **flash de borde neón** del botón → dispara una transición
  (clip-path wipe). `click.wav` sincronizado al press.
- **Iconos grandes**: los logos IG/YT/TT y glyphs de cada feature entran con pop/rotación,
  tamaño XL (200–320px), como protagonistas (no chips chiquitos).
- Continuidad de movimiento: el cursor SIEMPRE se está moviendo o algo scrollea; los
  device-mocks nunca quietos (micro-parallax constante).

### 2.2 Beat sheet (sync al VO)
- **S1 Intro (0–3.31)** — "Esto es Content Center / el estudio donde corro mi marca."
  Logo/wordmark gigante entra con scale+tilt; el cursor cruza la pantalla; un device-mock
  (dashboard) hace su entrada 3D al fondo y empieza a scrollear lento. Micro-beats: wordmark
  pop (0.2) → cursor in (0.6) → device tilt-in (1.4) → scroll arranca (2.0).
- **S2 Dashboard (3.31–6.27)** — "Tus métricas… en una sola pantalla."
  Device-browser grande con el dashboard scrolleando (parallax de las cards) → **zoom-in**
  a las 3 plataformas (IG/TT/YT con sus logos GRANDES) → el cursor hace **click en "Refrescar
  métricas"** (click SFX + flash) → las barras se llenan de golpe. Nada quieto: scroll →
  zoom → click → fill encadenados.
- **S3 Guiones IA (6.27–9.31)** — "De una idea a un guion listo, con IA."
  Cursor click en un botón **"Generar con IA"** → ripple → aparece el icono de Claude
  grande + un guion que se "arma" (hook/desarrollo/CTA entran en cascada rápida) dentro de
  un phone-mock. Énfasis en el icono IA grande, no en el texto del guion.
- **S4 Publicación (9.31–12.68)** — "Publicás en Instagram, YouTube y TikTok a la vez."
  Los 3 logos GRANDES (IG/YT/TT) entran con pop secuencial al ritmo de las palabras
  (`Instagram`=10.26, `YouTube`=10.87, `TikTok`=11.51). Cursor click en **"Publicar"** →
  los 3 iconos "salen disparados" hacia 3 device-mocks (un toast "✓ publicado" en cada uno).
- **S5 Predicción (12.68–15.52)** — "Sabés si un video va a explotar antes de subirlo."
  Un **"5×" / gauge gigante** que sube; un icono de cohete/llama grande; el cursor hover
  sobre "Outlier". Al decir `explotar` (13.91) → un burst/explosión de partículas (neón)
  determinista. Grande, visual, casi sin texto.
- **S6 CTA (15.52–19.55)** — "Todo tu contenido en un solo lugar. Sumate a la lista."
  Wordmark "Content Center" gigante + botón "Sumate a la lista" XL; cursor viaja y hace el
  **click final** (click SFX + ripple grande + flash) → la URL aparece. Cierre potente.

### 2.3 Assets a preparar (var A)
- Fonts: Poppins 600/700 (headlines), DM Sans (UI de los mocks), JetBrains Mono (labels),
  Instrument Serif (acentos). woff2 local.
- SFX: `whoosh.mp3` (reuso), **`click.wav`** + `tick.wav` (sintetizar, research §3).
- Reuso: paths de logos IG/YT/TT, paneles de pantallas (dashboard/guiones/publicación),
  `vo.mp3`, `music.mp3`.

### 2.4 Build steps (var A)
1. Scaffold proyecto `ezelamas-var-cursor` (init blank landscape), copiar `fonts/`, `vo.mp3`,
   `music.mp3`, `whoosh.mp3`; bajar Poppins; sintetizar `click.wav`/`tick.wav`.
2. Construir el sistema base: `.device--browser`/`.device--phone`, cursor SVG, ripple, los
   paneles de app-screen recreados, helpers de transición (reuso tH/tV pero acá más cortes).
3. Autorar las 6 escenas con el beat sheet, sincronizando cursor-clicks a `click.wav` y los
   pops de iconos a las palabras del VO. Asegurar: nada estático >0.5–1s.
4. `lint`/`inspect` (0 errores). `render`. Extraer frames (holds + mid-transición + el momento
   del click). Mirar. QA workflow → fixes → re-render (≥2 pasadas).
5. Copiar `cc-cursor.mp4` + poster a `public/demo/`.

---

## PARTE 3 — Variación B: "Captions / Karaoke"

**Concepto:** caption-forward. El VO se subtitula con estilo, sincronizado palabra a
palabra. En los momentos clave, **una sola palabra a la vez** (karaoke, cambio casi
instantáneo); en otros, **frases completas de 4–5 palabras** con la palabra hablada
resaltada. Combina **Poppins** (geométrica, para los captions/keywords) con **Caveat**
(manuscrita que "se escribe") para los acentos. Visual de fondo más sobrio/editorial que
la kinetic, para que el protagonista sea el texto en movimiento.

### 3.1 Técnicas núcleo (de research — cheat-sheet captions)
- **Karaoke palabra-por-palabra** (caps §1): un `<span>` por palabra, todos apilados en la
  misma caja, `opacity:0`; en cada `word.start` un `tl.set` prende la actual y apaga la
  anterior (swap instantáneo, seek-safe). Micro-pop de 0.12s (`back.out(2)`) por palabra.
- **Captions completos 4-5 palabras** (caps §2): agrupar por frase/pausa; entrada (0.25s)
  → hold → **exit duro** (`tl.to opacity:0` + `tl.set visibility:hidden` en `group.end`).
  Overflow con `fitTextFontSize`. Un grupo visible a la vez.
- **Highlight de la palabra hablada** (caps §3): recolor+scale (`#c8ff00`, scale 1.12) por
  palabra dentro del caption, o marker-sweep / círculo hand-drawn en keywords. Ciclar modos
  (index-driven, no random).
- **Caveat "se escribe"** (caps §4): para palabras-acento (ej. "marca", "viral", "todo"):
  reveal left→right con `clip-path: inset(0 100% 0 0)→inset(0 0% 0 0)`, `ease:"none"` (pluma
  a velocidad constante) + un punto "pluma" que sigue el borde. Alternativa premium:
  SVG stroke-draw (`pathLength=1`, `strokeDashoffset 1→0`) si vale la pena trazar la palabra.

### 3.2 Estrategia de captions por frase (qué va karaoke vs completo)
- **S1 (0–3.61)** "Esto es **Content Center**…": **karaoke** palabra-por-palabra; "Content
  Center" grande en Poppins 700; "marca" (3.05) escrita en **Caveat** (clip reveal).
- **S2 (3.61–6.57)** "Tus métricas… en una sola pantalla": **caption completo** 4-5 palabras,
  con "métricas" (3.81) y "pantalla" (5.96) resaltadas (color pop). Fondo: barras/sparkline sutiles.
- **S3 (6.57–9.61)** "De una idea a un guion listo, con IA": **karaoke** rápido; "idea"→"guion"
  con highlight; "IA" con un círculo hand-drawn al decir `A` (9.11).
- **S4 (9.61–12.98)** "Publicás en **Instagram, YouTube y TikTok** a la vez": **karaoke** con
  cada plataforma apareciendo con su **logo** + su color al pronunciarla (Instagram=10.26 magenta,
  YouTube=10.87 rojo, TikTok=11.51 cyan). "a la vez" en Caveat.
- **S5 (12.98–15.82)** "Sabés si un video va a **explotar** antes de subirlo": **caption completo**;
  "explotar" (13.91) con burst/marker-sweep neón + scale pop fuerte.
- **S6 (15.82–19.55)** "**Todo** tu contenido, en un solo lugar. **Sumate a la lista**": cierre —
  "Todo" y "Sumate a la lista" grandes; "lista" (18.89) escrita en Caveat; botón/URL.

### 3.3 Visual de fondo (sobrio pero nunca estático)
Fondo editorial dark con: grid sutil que driftea, un glow que respira, y elementos
geométricos mínimos (líneas/acento) que se mueven detrás del texto. El movimiento principal
es el **texto** (palabras que entran/cambian/resaltan cada 0.15–0.6s) → cumple "nada estático".
Opcional: una barra de progreso/onda de audio sutil abajo que avanza con el VO.

### 3.4 Assets a preparar (var B)
- Fonts: **Poppins 600/700** + **Caveat 600** (bajar woff2 latin) + DM Sans/Mono/Instrument
  Serif. `@font-face` `font-display:block`.
- Datos: array `WORDS` (62) con `{text,start,end}` y `GROUPS` (agrupado por frase) embebidos.
- Audio: `vo.mp3`, `music.mp3`, `whoosh.mp3` (transiciones suaves entre bloques).

### 3.5 Build steps (var B)
1. Scaffold `ezelamas-var-captions`; copiar/bajar fonts (Poppins+Caveat); copiar audio.
2. Embeber `WORDS`/`GROUPS`; construir el motor de captions (karaoke spans apilados +
   grupos + highlight + Caveat clip-reveal) siguiendo el cheat-sheet (seek-safe, kill duro).
3. Autorar el fondo editorial + las 6 frases con su estrategia (karaoke/completo/highlight/
   Caveat). Verificar legibilidad y que el texto cambie lo suficientemente rápido.
4. `lint`/`inspect` (0 errores; ojo overflow de captions). `render`. Extraer frames en
   varios `word.start` (para ver cada caption) + transiciones. QA workflow → fixes →
   re-render (≥2 pasadas).
5. Copiar `cc-captions.mp4` + poster a `public/demo/`.

---

## Entrega final
- 3 videos en `public/demo/`: `cc-kinetic.mp4` (ya), `cc-cursor.mp4`, `cc-captions.mp4`.
- `ContentCenterDemo.tsx` → galería de 3 (label + descripción + player c/u).
- Fuentes de cada composición en `video/` (como la kinetic) para reproducibilidad.
- Build + verificación de la página; sumar al repo.
