# Reporte de capacidades — ezequiellamas.com (Personal Brand / Content Engine)

> **Propósito de este documento:** enumerar TODO lo que la plataforma ya hace (estado actual del repo, junio 2026), descrito en términos de *capacidad* y *"job to be done"*, para que un modelo de IA haga investigación profunda en internet y encuentre: (a) herramientas de IA que ya existan en el mercado y hagan algo similar, (b) cómo lo resuelven mejor, y (c) funciones nuevas que valga la pena sumar. Cada feature incluye una **"categoría de mercado a investigar"** con términos de búsqueda y ejemplos de competidores conocidos como ancla.

---

## 0. Qué es el producto

Un **motor de contenido casi autónomo para un creador personal** (marca personal de un solo creador, con un equipo chico de editores/asesores). La tesis: producir MUCHO contenido sin gastar tiempo proporcional. El único trabajo manual deseado es grabar long-form de YouTube; todo lo demás (shorts, estructura, títulos, portadas, captions, adaptación desde competidores, programación, publicación) es asistido o generado por IA, y la IA habla en la **voz del creador** usando un perfil configurable.

Es una **PWA** (instalable, mobile-first) construida como SPA. No es un SaaS multi-tenant: es la "sala de máquinas" de una sola marca personal, con roles (admin = el creador; editor; asesor).

---

## 1. Stack y arquitectura (resumen)

- **Frontend:** Vite + React 18 + TypeScript + React Router + Tailwind + shadcn/ui. PWA (instalable, offline banner, push). Mobile-first (bottom tab bar, quick-capture, bottom-sheet gallery menu).
- **Backend:** Supabase (Postgres + RLS por owner/rol, Auth, Storage, Realtime, Edge Functions en Deno). **~50 edge functions** desplegadas. Cron vía `pg_cron` + `pg_net`.
- **Modelos / APIs de IA y servicios integrados:**
  - **Claude (Anthropic) Sonnet 4.6** — generación/clasificación de texto (guiones, captions, conceptos, reportes estratégicos, estructuras de video) con tool-use.
  - **OpenAI Whisper** — transcripción de audio/video.
  - **Gemini (Nano Banana / image)** — generación de portadas/thumbnails.
  - **HeyGen** — avatares / clon de video (talking head) con múltiples "looks".
  - **ElevenLabs** — clonación de voz / TTS.
  - **Apify** — scraping de Instagram / YouTube / TikTok (métricas + transcripts vía subtítulos).
  - **YouTube Data API v3** — sync del canal propio (OAuth + API key).
  - **Zernio** — publicación multi-plataforma (IG/YT/TikTok) vía un solo proveedor.
  - **Bunny Stream** — hosting/CDN/encode de video (uploads TUS) + Supabase Storage como fallback.
  - **Resend** — emails transaccionales. **Web Push (VAPID)** — notificaciones push.
  - **Railway** — renderer de carruseles/motion graphics a imagen/video.

---

## 2. Inventario de features por área

### A. Perfil de creador + prompts de IA editables ("voz configurable")
- **Qué hace:** una sección de Configuración con (1) perfil de marca (producto/servicio, audiencia, estrategia short/long, referentes aspiracionales), (2) cuestionario de identidad (quién soy, mi historia, qué transmito, por qué creo, impacto, expertise), y (3) **editor de los prompts del sistema** que usa la IA (manifiesto de marca, reglas de guion, hook bank, etc.) con "restaurar default". Todo eso se inyecta como contexto en cada generación.
- **Job-to-be-done:** que la IA escriba/adapte en la voz real del creador sin hardcodear su persona; ajustar el comportamiento de la IA sin tocar código.
- **Investigar:** *AI brand voice / custom AI persona / editable system prompts for creators* — ej. Jasper Brand Voice, Copy.ai brand voice, Writer.com, Typeface, Cuvi.

### B. Ideas → Guiones (script generation)
- **Qué hace:** subís una idea por texto o **audio** (se transcribe con Whisper), elegís un "formato", y Claude genera un guion en tu voz inyectando tus últimos guiones como few-shot. Versiona scripts, vincula a "shapes" (estructuras narrativas), "series" (multi-parte) y B-rolls.
- **Job-to-be-done:** convertir una idea cruda (incluso un audio de voz al pasar) en un guion listo para grabar.
- **Investigar:** *AI short-form script generator, voice-note to script, hook generators* — ej. Taja, Cuvi, Crayo AI, AutoShorts, ScriptGPT.

### C. "Crear a partir de ideas" — adaptar contenido de competidores a tu voz (3 modos)
- **Qué hace:** sección dedicada donde combinás uno o varios virales del banco (o pegás un link) como **ingredientes** y generás contenido nuevo en 3 modos: copiar el copy, adaptar a tu voz, o seguir instrucciones. (El toggle "Largo" está como *próximamente*; la generación larga vive en el Studio.)
- **Job-to-be-done:** "ingeniería inversa" de virales ajenos para producir tu propia versión rápida.
- **Investigar:** *content remix / swipe file to script, competitor content repurposing AI* — ej. 1of10, Viralyft, ChatGPT custom GPTs de "rewrite viral".

### D. Carruseles AI
- **Qué hace:** generás un carrousel (Claude) a partir de concepto + cantidad de slides + ángulo de hook + CTA, con plantillas (T1 Cover / T2 Feature / T3 Grid / T4 VS / T5 CTA). Se renderiza a imágenes (renderer en Railway → bucket) listas para publicar. Regeneración de slides individuales. Scrapeo de carruseles de referencia.
- **Job-to-be-done:** producir carruseles de Instagram/LinkedIn sin diseñar a mano.
- **Investigar:** *AI carousel generator (Instagram/LinkedIn)* — ej. Postnitro, AdGen AI, Carousel.so, Taplio (LinkedIn), Contentdrips.

### E. Videos + métricas (analytics multi-plataforma del contenido propio)
- **Qué hace:** modelo de "video lógico" con un row por plataforma (`video_posts`). **Scraping vía Apify** de IG/YT/TikTok que mapea ~20 campos (views/likes/comments/shares/saves/duración/thumbnail/etc.), guarda historial de métricas, descarga el thumbnail a storage permanente, y calcula un **multiplicador de performance** (vs el promedio de los últimos 90 días) con tiers (outlier ≥7×, 5×, 3×, normal). **Discovery automático**: descubre e importa los últimos posts de tus handles. Vincular plataformas a un video existente.
- **Job-to-be-done:** un panel unificado de cómo performó cada pieza, sin entrar a cada app, con detección de outliers.
- **Investigar:** *cross-platform creator analytics, outlier detection content* — ej. Metricool, Shield (LinkedIn), Social Blade, Viralfindr, Air Media, Dash Hudson.

### F. Transcripción (multi-fuente)
- **Qué hace:** YouTube → parsea subtítulos auto-generados (gratis, cualquier duración); IG/TikTok → descarga audio y Whisper. Cachea transcripts. (Usado por guiones, captions, análisis de referentes, Studio.)
- **Investigar:** *video transcription API, YouTube auto-caption scraping* — ej. Whisper, AssemblyAI, Deepgram, Tactiq.

### G. B-rolls (sugerencias + render)
- **Qué hace:** sobre un guion, sugiere B-rolls y los puede renderizar (pipeline con renderer externo). Estilos/plantillas, imagen intermedia, biblioteca.
- **Investigar:** *AI b-roll generation, auto b-roll for talking-head* — ej. Submagic, Captions AI, Pictory, AutoShorts b-roll.

### H. Motion graphics
- **Qué hace:** biblioteca de plantillas de motion graphics + sugerencias por guion + render a video.
- **Investigar:** *AI motion graphics / animated captions / templated video overlays* — ej. Captions, Submagic, Veed, Kapwing.

### I. Portadas / thumbnails (generación de imagen)
- **Qué hace:** genera portadas/thumbnails con Gemini (image), sugiere estilo de portada, descarga la imagen.
- **Investigar:** *AI YouTube thumbnail generator* — ej. Pikzels, Thumbnail AI, ThumbnailsLabs, Canva Magic.

### J. Referentes — análisis de competencia por video (corto y largo)
- **Qué hace:** banco de creators de inspiración (con handles IG/YT/TikTok). Scrapea sus virales (incluye **YouTube largo + Shorts con subtítulos**). Por cada video saca **transcript + concepto**: para contenido corto → hook/formato/ángulo/CTA + resumen; para contenido **largo (≥3 min)** → **desglose estructurado** (tesis, estructura por capítulos, argumentos clave, dónde cae la oferta/CTA, tácticas de retención). Clasificación estratégica por video: objetivo de negocio (viralidad/nutrición/conversión), objetivos de contenido (educar/entretener/inspirar), tipo de contenido, temas principales. Grid con filtros, "Adaptar a mi voz".
- **Job-to-be-done:** decodificar QUÉ hace funcionar el contenido de los referentes, a nivel pieza, para aprender y replicar.
- **Investigar:** *competitor content analysis AI, viral video breakdown, hook/structure extraction* — ej. 1of10, Viralfindr, Minea (ads), Foreplay (ad swipe), Notus.

### K. Referentes — reportes de marca y estrategia (multi-modo)
- **Qué hace:** genera informes en Markdown de la estrategia de un referente, con **toggle por ecosistema** y **3 tipos de reporte**: **Redes cortas (IG+TikTok)**, **YouTube (canal/contenido largo)** — cada uno con un análisis distinto porque las estrategias difieren — y **Síntesis cross-formato** que cruza ambos para inferir **cómo usan cada plataforma/formato y cómo llevan tráfico** (corto → largo → oferta) y dónde está el negocio. Cubre evolución temporal (qué cambió, qué dejó/empezó a hacer), mix de objetivos, e **inferencia del modelo de negocio**. Incremental por modo (solo procesa lo nuevo desde el último informe).
- **Job-to-be-done:** un "informe de inteligencia competitiva" automático por creador, no por pieza: ¿cuál es su jugada completa?
- **Investigar:** *AI competitive intelligence for creators, content strategy report generator, funnel/traffic analysis from content* — ej. ningún dominante claro (oportunidad); cercanos: HypeAuditor, Modash, Phlanx, social listening (Brandwatch).

### L. YouTube — integración Data API (canal propio)
- **Qué hace:** conectás tu canal por **OAuth** (o solo API key), sincroniza tus videos (metadata + métricas), y los analiza (transcript por subtítulos + concepto/clasificación, igual que referentes).
- **Investigar:** *YouTube analytics + AI insights* — ej. vidIQ, TubeBuddy, Spotter Studio.

### M. YouTube Studio — producción de contenido LARGO (clon de creador)
- **Qué hace:** de una idea (texto o audio) + selector de duración (corto/medio/largo) → genera una **estructura** (intro / capítulos con bullets + duración por sección / CTA) y **5 títulos**. Editor por sección con asignación creador-vs-clon. **Pipeline de clon:** HeyGen (avatar, con múltiples "looks", render 9:16 por default) + ElevenLabs (voz), webhook → Bunny CDN. (Las portadas/títulos reusan generación de imagen.)
- **Job-to-be-done:** producir video largo (o partes de él) sin grabar todo a cámara, manteniendo identidad.
- **Investigar:** *AI long-form video / AI avatar video / talking-head clone* — ej. HeyGen, Synthesia, Argil, Captions AI (avatars), Arcads; estructura de guion largo: vidIQ, Spotter, 1of10.

### N. Publicación / scheduling multi-plataforma
- **Qué hace:** programá videos y carruseles a IG/YT/TikTok desde un solo lugar (vía **Zernio**). **Horarios óptimos** configurables por día/hora → sugerencias del próximo slot libre + conciencia de slots ocupados. Calendario mensual. Conexiones OAuth (click-to-connect). Detalle por post con jobs por plataforma (cancelar/retry/mark-TikTok-done). **Cron cada minuto** que dispara recordatorios T-30min y publica lo que vence. Push + email cuando llega la hora.
- **Job-to-be-done:** un scheduler multi-red con publicación automática y sugerencia de mejor horario.
- **Investigar:** *social media scheduler / multi-platform publishing API, best time to post* — ej. Buffer, Hootsuite, Later, Metricool, Publer, Postiz (open source), Blotato, Ayrshare/Zernio (API).

### O. Subida en lote (batch) con worker en segundo plano
- **Qué hace:** subís varios videos de una; cada uno sube a Bunny en el browser y luego un **worker en segundo plano** (cron) transcribe, genera caption/título/hashtags con IA y lo **programa al próximo horario óptimo libre** — podés cerrar la app. Progreso en vivo (realtime).
- **Job-to-be-done:** cargar un lote de contenido y que se procese y agende solo.
- **Investigar:** *bulk schedule + auto-caption pipeline, background content processing* — ej. Buffer bulk, Metricool bulk, Repurpose.io, Postiz.

### P. Clips → Propuestas de Reels (descubrir qué clip merece más alcance)
- **Qué hace:** marcás un batch como "clips" → se publican **solo a TikTok + YouTube Shorts**. A los **N días** (configurable) de publicado cada clip, un worker refresca sus métricas (Apify), las compara contra tu histórico de clips (umbral híbrido relativo/absoluto, **configurable desde Configuración**), y los que performaron mejor generan una **propuesta de Reel** justificada con métricas. Aprobás 1-click (programar a IG al próximo slot / publicar ahora) o rechazás.
- **Job-to-be-done:** dejar que el contenido "se gane" su cross-post a Instagram según data real, en vez de adivinar.
- **Investigar:** *cross-posting based on performance, repurpose top performers, A/B platform testing* — categoría poco cubierta (oportunidad); cercanos: Repurpose.io, OpusClip (clip ranking "virality score"), Tubebuddy.

### Q. Workflow de equipo (editor / asesor)
- **Qué hace:** roles admin/editor/asesor con RLS. Asignaciones de edición (cola, submissions, correcciones, ganancias del editor), feedback de asesores (comentarios threaded sobre videos), aprobación de guiones. Alta de miembros + email de acceso brandeado (Resend) + PWA install.
- **Investigar:** *creator team collaboration / content approval workflow* — ej. Planable, Gain, Approval Studio, Frame.io (video review).

### R. Biblioteca de recursos pública (`/recursos`)
- **Qué hace:** librería de recursos DB-backed pública (lead magnets / contenido).
- **Investigar:** *resource library / link-in-bio + gated content* — ej. Beacons, Stan Store, Linktree.

### S. PWA / experiencia mobile (captura sobre la marcha)
- **Qué hace:** instalable como app; navegación thumb-first (bottom tab bar + FAB de **Captura rápida** de ideas), menú galería en bottom-sheet, banner offline, prompt de instalación. Pensado para capturar ideas y operar desde el teléfono.
- **Investigar:** *mobile-first creator capture, voice-note idea capture PWA* — ej. Notion mobile, Cap, Castmagic mobile, Riverside.

### T. Notificaciones (in-app + web push)
- **Qué hace:** notificaciones in-app + **web push (VAPID)** + email, con dedupe, para recordatorios de publicación, fallos, propuestas de Reels, asignaciones, feedback.

---

## 3. Infraestructura transversal (relevante para comparar madurez técnica)

- **IA orquestada con tool-use** (Claude emite JSON estructurado: conceptos, captions, estructuras, reportes).
- **Prompt overrides + perfil de creador** inyectados como contexto cacheado en cada generación (voz consistente).
- **Scraping unificado** (Apify) IG/YT/TikTok con dedupe y descarga de thumbnails a storage permanente.
- **Pipeline de video**: upload TUS a Bunny Stream (+ fallback Supabase Storage), encode, transcode, transcripción, CDN.
- **Workers en segundo plano** vía `pg_cron` + `pg_net` → edge functions (scheduler, batch, análisis de clips) con claim atómico y recuperación de estados colgados.
- **Realtime** para progreso en vivo (batch, propuestas, renders).
- **RLS triple** (admin/editor/asesor) en todo el modelo de datos.

---

## 4. Lo que falta / roadmap (para buscar inspiración)

Áreas donde queremos mejorar o sumar (terreno fértil para que la investigación traiga ideas/herramientas):

1. **Generación de contenido LARGO desde "Crear a partir de ideas"** — hoy el atajo está como "Próximamente"; el flujo largo vive en el Studio. Falta el puente ideas→Studio.
2. **Clipping automático de long-form → shorts** (cortar 30-90s de un video largo). Hoy es manual. → *Opus Clip, Vizard, Klap, 2short, Spikes, Munch.*
3. **Síntesis estratégica de referentes potenciada** — el reporte combinado podría leer el desglose estructurado completo, no solo el resumen.
4. **Map-reduce para transcripts muy largos** (>50 min) en el análisis de referentes (hoy head/tail).
5. **Espejar el análisis "modo largo" en el canal propio** (no solo referentes).
6. **Detección de tendencias / temas emergentes** entre referentes (qué empezó a funcionar en el nicho).
7. **Slides de presentación como fondo de video** (reusar el renderer de carruseles).
8. **Pre-render / SSG para SEO** en landing y `/recursos`.
9. **Sugerencia de ideas proactiva** (de los análisis de referentes + performance propia).

---

## 5. Categorías de mercado a investigar (lista consolidada de search terms)

Para el modelo de investigación — buscar herramientas, cómo lo resuelven, pricing, y features que nos falten en cada categoría:

1. **AI brand voice / editable AI persona** para creadores.
2. **AI short-form script & hook generation** (voz-nota → guion).
3. **Competitor / viral content analysis** (breakdown de hook, estructura, retención, oferta) por pieza y por creador.
4. **AI competitive intelligence reports** para creadores (estrategia, embudo, modelo de negocio inferido).
5. **AI carousel generators** (IG/LinkedIn).
6. **AI avatar / talking-head video & voice cloning** (long-form).
7. **AI long-form YouTube scripting / video structure & title generation.**
8. **AI thumbnail generation.**
9. **AI b-roll & animated captions / motion graphics.**
10. **Long-form → shorts auto-clipping** con scoring de viralidad.
11. **Multi-platform social scheduling & publishing APIs** + best-time-to-post.
12. **Bulk upload + auto-caption + auto-schedule pipelines.**
13. **Performance-based cross-posting / repurposing** (promover top performers entre plataformas).
14. **Cross-platform creator analytics & outlier detection.**
15. **Content approval / team collaboration** para creadores.
16. **All-in-one "Creator OS"** (¿alguien junta todo esto en un solo producto? — clave para entender el competidor integral).

Competidores "all-in-one" a estudiar específicamente como referencia integral: **Metricool, Buffer, vidIQ, OpusClip, HeyGen, Castmagic, 1of10, Taja, Submagic, Repurpose.io, Postiz (open source), Blotato.**
