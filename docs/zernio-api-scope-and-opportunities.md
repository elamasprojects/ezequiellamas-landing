# Reporte — Alcance completo de la API de Zernio + oportunidades para la app

> Investigación profunda de `docs.zernio.com` + el OpenAPI spec oficial (`zernio.com/openapi.yaml`, v1.0.4) + los SDKs oficiales (PHP/Rust generados del spec, nombres de campo verbatim) + análisis de cómo usamos Zernio hoy en el repo. Junio 2026.

## /GOAL — cobertura (todos los alcances cubiertos ✓)
1. ✓ Auth, API keys, rate limits, errores, paginación
2. ✓ Profiles, Accounts, conexión OAuth, follower-stats
3. ✓ Posts: create/schedule/publishNow/list/get/update/delete/retry/unpublish/edit/bulk/recycle
4. ✓ `platformSpecificData` por plataforma (15 redes)
5. ✓ Media (presign + direct + URL, límites)
6. ✓ **Analytics** (post-level, agregado, account/audience, demographics) + veredicto Apify
7. ✓ Inbox/mensajería/comentarios/reviews/leads/CRM (superficie identificada)
8. ✓ Webhooks (~30 eventos, HMAC, reintentos)
9. ✓ Queue / best-time
10. ✓ Otros: recycling, MCP oficial, SDKs, CLI, n8n/Make/Zapier, ads

---

## 0. TL;DR — lo que importa

- **Hoy usamos ~3% de Zernio**: un solo endpoint (`POST /v1/posts` para publicar) + sus webhooks. Todo lo demás (analytics, queue, best-time, accounts, media presign, recycling, inbox) está sin tocar.
- **Tu hipótesis es correcta**: las métricas de **tus cuentas propias conectadas** se pueden sacar **nativas de Zernio**, con más detalle y first-party que Apify.
  - **Instagram → Zernio reemplaza Apify y mejora** (saves, reach, watch-time de Reels, demographics, follower growth).
  - **YouTube → estrictamente mejor** (minutos vistos, retención, subs ganados/perdidos por video y por día).
  - **TikTok → parcial**: account/follower stats sí; **no hay endpoint per-video** → para profundidad per-video, **Apify sigue de fallback**.
  - **Referentes (competidores) → Apify obligatorio** (son cuentas NO conectadas; Zernio analytics no las toca).
- **Caveat de costo**: analytics es un **add-on pago** de Zernio (devuelve `402 "Analytics add-on required"` si no está). Delays: IG ~48h, YT 2–3 días; ventanas de 89–90 días por llamada; follower counts 1×/día.
- **`best-time`** de Zernio (día+hora+engagement con data real) puede **reemplazar nuestra heurística manual de `publishing_slots`**.
- **Existe un MCP oficial de Zernio** (`https://mcp.zernio.com/mcp`, 280+ tools) + SDKs (Node/Python/Go/…) — podríamos dejar de hand-rollear el HTTP.

---

## 1. Cómo usamos Zernio HOY (el punto de partida)

| Superficie | ¿La usamos? |
|---|---|
| `POST /v1/posts` (publicar con `publishNow`, `platforms[]`, `mediaItems[]`, `platformSpecificData` básico) | ✅ Sí (`publish-now`) |
| Webhooks (`post.*`, `account.connected/disconnected`) | ✅ Sí (`zernio-webhook`, HMAC validado) |
| Analytics (todos) | ❌ No → usamos **Apify** (`scrape-video`, `discover-and-import-videos`) |
| Accounts list / status / follower-stats | ❌ No (sólo recibimos connected/disconnected por webhook) |
| Queue / best-time | ❌ No → tenemos `publishing_slots` manual |
| Media presign | ❌ No → subimos a Bunny y pasamos URL |
| Recycling / retry / unpublish / edit / update | ❌ No |
| Inbox / comentarios / reviews / leads / CRM / ads | ❌ No |
| MCP / SDK oficial | ❌ No (HTTP hand-rolled) |

---

## 2. Modelo de datos

`Usuario → Profiles (marcas/proyectos) → Accounts (1 por red social) → Posts (fan-out a N accounts) → Queue (slots semanales opcionales)`. Las API keys pueden scopearse a todos los profiles o a `profileIds` específicos, con permiso `read` o `read-write`.

## 3. Auth, límites, errores
- **Base:** `https://zernio.com/api/v1` · **Auth:** `Authorization: Bearer sk_…` (64 hex). Keys hasheadas server-side, se muestran completas 1 sola vez.
- **Rate / velocity:** `429` con **15 posts/hora por cuenta** + cooldowns + límites diarios por plataforma. (No publican un X-RateLimit formal.)
- **Dedupe:** `409` si mismo `(platform, accountId, content-hash)` en 24h (devuelve `details.existingPostId`). **Idempotencia:** header `x-request-id` (mismo id en 5 min → devuelve el original con 200).
- **Errores:** `400/401/402/403/404/409/429/500`, shape `{ "error": "…" }`. `402` = límite de plan o add-on faltante.
- **Paginación:** `page` (1-based) + `limit` (1–100); respuestas con `total` + `pages`/`hasMore`.
- **Pricing:** primeras **2 cuentas gratis** (API completa incluida); luego por cuenta/mes (3–10: $6 c/u, 11–100: $3, 101+: $1). Posts ilimitados. **Analytics = add-on aparte.**

## 4. Profiles & Accounts & conexión OAuth
- **Profiles:** `GET/POST /v1/profiles`, `GET/POST/DELETE /v1/profiles/{id}`.
- **Accounts:** `GET /v1/accounts` (filtros `profileId/platform/status/page/limit`; devuelve `_id, platform, username, displayName, profileUrl, avatar, isActive` + top-level **`hasAnalyticsAccess`**), `DELETE /v1/accounts/{id}` (desconectar).
- **Conexión OAuth hosteada:** `GET /api/v1/connect/{platform}?profileId=…&redirectUrl=…` → devuelve `{ authUrl }`; el usuario autoriza en el browser y la cuenta aparece. Zernio maneja todo el OAuth (no necesitás apps de Meta/Google/TikTok). 15 plataformas.
- **`GET /v1/accounts/follower-stats`** → serie temporal de followers por cuenta (`date`, `followers`, granularidad diaria).
- **API keys:** `GET/POST/DELETE /v1/api-keys`. **Invites de equipo:** `POST /v1/invite/tokens` (roles member/viewer/billing_admin, single-use 7 días).

## 5. Posts — lifecycle completo
| Método | Path | Qué |
|---|---|---|
| POST | `/v1/posts` | Crear / programar / publishNow / draft (fan-out a N plataformas) |
| GET | `/v1/posts` | Listar (filtros status/platform/profile/account/fecha/`search`, sort) |
| GET | `/v1/posts/{id}` | Obtener (con status + `platformPostId` + `platformPostUrl` por plataforma) |
| PUT | `/v1/posts/{id}` | Editar (draft/scheduled/failed/partial/cancelled; published sólo `recycling`) |
| DELETE | `/v1/posts/{id}` | Borrar draft/scheduled (reembolsa cuota) |
| POST | `/v1/posts/{id}/retry` | Reintentar un post fallido |
| POST | `/v1/posts/{id}/unpublish` | Borrar de la plataforma (no IG/TikTok/Snapchat) |
| POST | `/v1/posts/{id}/edit` | Editar texto publicado (sólo X/Twitter Premium, ≤1h, ≤5 veces) |
| POST | `/v1/posts/bulk-upload` | Alta masiva desde CSV |

- **Estados:** `draft|scheduled|publishing|published|failed|partial`; por plataforma `pending|publishing|published|failed`. (Coincide con nuestro `scheduled_post_status`.)
- **Modo:** `publishNow:true` (inmediato, devuelve `platformPostUrl`), `scheduledFor` (programado), `queuedFromProfile` (al próximo slot del queue), nada → draft.
- **Per-plataforma:** cada `platforms[]` lleva `accountId` + opcionalmente `customContent`, `customMedia`, `scheduledFor`, `platformSpecificData`. (Más rico de lo que usamos hoy.)
- **Recycling/evergreen** (`RecyclingConfig`): repost automático semanal/mensual, ≤10 activos por cuenta (no YT/TikTok), con `contentVariations[]` round-robin.

## 6. `platformSpecificData` — capacidades por plataforma (resumen)
- **Instagram:** `contentType` (feed/reels/story), `collaborators[≤3]`, `userTags[{username,x,y,mediaIndex}]`, **`firstComment`**, `shareToFeed`, `instagramThumbnail`, `trialParams` (Reels A/B).
- **YouTube:** `title`, `visibility`, `madeForKids`, `categoryId`, `playlistId`, **`firstComment`**, `tags[]`, `containsSyntheticMedia`.
- **TikTok:** `privacy_level`, `allow_comment/duet/stitch`, `commercialContentType`, `video_made_with_ai`, fotos-carrusel (≤35), y **`draft:true` = Creator Inbox** (¡esto es nuestro "mark-tt-done" nativo!).
- **LinkedIn:** `organizationUrn` (página), `documentTitle` (PDF carrusel), `firstComment`, `geoRestriction`.
- **X/Twitter:** `threadItems[]`, `poll`, `quoteTweetId`, `replyToTweetId`, `replySettings`, `longVideo`.
- **Facebook:** reels/story/carousel (`carouselCards[2-5]`), `firstComment`, `pageId`, `draft`.
- **Pinterest:** `boardId`, `title`, `link`, cover de video. **Threads/Bluesky:** thread chains, ≤10 imgs.

## 7. Media
- **3 vías:** (a) URL pre-hosteada en `mediaItems[].url` (lo que hacemos con Bunny), (b) `POST /v1/media/presign` → `PUT` bytes → `publicUrl`, (c) `POST /v1/media/upload-direct` (multipart).
- **Límites:** imágenes/videos hasta **5GB**; PDF (LinkedIn) 100MB/300pág. Max items por red (IG 10 carrusel, LinkedIn 20, TikTok 35 fotos, video siempre 1). `MediaItem`: `type, url, title, altText, thumbnail, instagramThumbnail`.

## 8. Queue / scheduling
- `GET/POST/PUT/DELETE /v1/queue/slots` (queues con slots `{dayOfWeek 0-6, time}` + timezone), `GET /v1/queue/next-slot`, `GET /v1/queue/preview?count=N`.
- Para encolar: pasar `queuedFromProfile` (+ `queueId`) al crear el post (no leer next-slot manualmente — eso saltea el locking).

## 9. Analytics — deep-dive (la parte clave) + veredicto Apify
> **Todos requieren el add-on de Analytics** (`402/403` si falta).

### Post-level (cross-platform)
- **`GET /v1/analytics`** — un post (`postId`, **acepta IDs externos** + `source=external`) o lista paginada. Campos `PostAnalytics`: `impressions, reach, likes, comments, shares, saves, clicks, views, engagement_rate, last_updated` + **IG Reels** `ig_reels_avg_watch_time`, `ig_reels_video_view_total_time`. Breakdown por plataforma con `platform_post_id`, `platform_post_url`, `sync_status`. `fromDate` default 90 días (máx 366).
- **`GET /v1/analytics/post-timeline`** — evolución **diaria** de un post tras publicarse (el equivalente nativo a re-scrapear un Reel cada día con Apify).

### Agregado (cross-platform)
- **`GET /v1/analytics/daily-metrics`** — métricas diarias agregadas + breakdown por plataforma (default 180 días).
- **`GET /v1/analytics/best-time`** — `day_of_week (0=Lun)`, `hour (0-23 UTC)`, `avg_engagement`, `post_count`. → **reemplaza nuestro `publishing_slots` manual con data real**.
- **`GET /v1/analytics/content-decay`** — curva de acumulación de engagement (qué % del engagement final se alcanza en cada ventana).
- **`GET /v1/analytics/posting-frequency`** — correlación cadencia (posts/semana) vs engagement.

### Account / audience (per-plataforma)
- **Instagram:** `GET /v1/analytics/instagram/account-insights` (`reach, views, accounts_engaged, total_interactions, profile_links_taps, follows_and_unfollows, …`, máx 90 días, delay 48h), `…/follower-history` (`follower_count, followers_gained, followers_lost`), `…/demographics` (edad/ciudad/país/género, requiere 100+ followers).
- **YouTube:** `GET /v1/analytics/youtube/channel-insights` (`views, estimatedMinutesWatched, averageViewDuration, subscribersGained/Lost`), **`…/youtube/daily-views?video_id=…`** (per-video diario: views, minutos vistos, retención, subs, likes/comments/shares), `…/demographics`. Delay 2–3 días.
- **TikTok:** `GET /v1/analytics/tiktok/account-insights` (`follower_count, following_count, likes_count, video_count, followers_gained/lost`, máx 89 días). **Sin endpoint per-video dedicado.**

### Veredicto Apify → Zernio (sólo cuentas propias conectadas)
| Plataforma | ¿Reemplaza Apify? | Qué gana de extra (first-party) | Qué falta |
|---|---|---|---|
| **Instagram** | ✅ Sí, total | saves, reach, watch-time Reels, demographics, profile-link taps, follower growth | delay 48h, add-on pago |
| **YouTube** | ✅ Sí, mejor | minutos vistos, retención, subs ganados/perdidos por video/día | delay 2–3 días, scope analytics al conectar |
| **TikTok** | ⚠️ Parcial | account/follower stats, views/likes/comments/shares en posts trackeados | **no hay per-video** → Apify de fallback |
| **Referentes** | ❌ No aplica | — | **Apify obligatorio** (cuentas no conectadas) |

## 10. Webhooks (~30 eventos)
- **Firma:** `X-Zernio-Signature` = HMAC-SHA256(raw body). Reintentos: 2xx en <5s, hasta 7 intentos, luego dead-letter. Endpoints para crear/actualizar/test.
- **Posts:** published, failed, partial, cancelled, scheduled, recycled, **external.created/updated/deleted**.
- **Accounts:** connected, disconnected, ads.initial_sync_completed.
- **Mensajería/engagement (sin usar):** `message.received/sent/read/…`, `conversation.started`, `reaction.received`, **`comment.received`**, **`review.new/updated`**, **`lead.received`**, `ad.status_changed`, + ciclo de vida de WhatsApp.

## 11. Superficie extra de Zernio (que no sabíamos que existía)
Zernio es **mucho más que publicar**: inbox unificado de mensajería/DMs, gestión de **comentarios** (recepción + respuesta), **reviews** (Google Business), captura de **leads**, **CRM** (contactos, broadcasts, sequences, automations) y **ads** (`meta-ads`, `google-ads`, `tiktok-ads`, etc.). Toda esta superficie está disponible vía API/CLI/MCP y hoy no la tocamos.

## 12. Developer surface
- **MCP oficial:** `https://mcp.zernio.com/mcp` (hosted, OAuth) o local (`uvx --from zernio-sdk[mcp] zernio-mcp`) — **280+ tools** sobre toda la API. (Era lo que pensabas que estaba conectado; existe, sólo hay que conectarlo.)
- **SDKs:** Node, Python, Go, Ruby, Java, PHP, .NET, Rust (`github.com/zernio-dev`).
- **CLI:** `@zernio/cli` (posts, accounts, media, inbox, contacts, broadcasts, sequences, analytics).
- **Integraciones:** n8n (`n8n-nodes-zernio`), Make, Zapier.

---

## 13. Oportunidades para sumar (rankeadas)

| # | Oportunidad | Impacto | Esfuerzo | Notas |
|---|---|---|---|---|
| 1 | **Métricas nativas de tus cuentas IG + YT** (reemplazar `scrape-video`/`discover` con Zernio analytics) | Alto | Medio | Edge function `zernio-analytics-sync`; más rico que Apify; requiere add-on |
| 2 | **`best-time` de Zernio → autocompletar/validar `publishing_slots`** | Alto | Bajo | Data real vs nuestra heurística; un GET |
| 3 | **Estado de salud de conexiones** (`GET /v1/accounts` + `hasAnalyticsAccess` + follower-stats) en el dashboard | Medio | Bajo | Avatar, username, follower count, "reconectar" |
| 4 | **`firstComment` + `customContent`/`customMedia` por plataforma** en `publish-now` | Medio | Bajo | Mejora calidad de publicación; ya soportado |
| 5 | **TikTok `draft:true` (Creator Inbox)** = formalizar nuestro "mark-tt-done" nativo | Medio | Bajo | |
| 6 | **`content-decay` + `posting-frequency`** como insights nuevos en el dashboard | Medio | Bajo | Features que hoy no tenemos |
| 7 | **`post-timeline`** para el historial de métricas de cada post propio | Medio | Bajo | Reemplaza re-scrapes diarios |
| 8 | **Recycling/evergreen** para reciclar top performers automáticamente | Medio | Medio | Se complementa con clips→Reels |
| 9 | **MCP oficial / SDK Node** en vez del HTTP hand-rolled en `publish-now` | Bajo | Bajo | Robustez/mantenimiento |
| 10 | **Queue nativo** como alternativa a nuestro cron `scheduler-tick` | Bajo | Medio | Evaluar; hoy el cron ya anda |
| 11 | **Inbox/comentarios/reviews/leads** (superficie nueva de producto) | Alto (si se quiere) | Alto | Funcionalidad de gestión de comunidad completa |

## 14. Caveats / constraints a diseñar
- **Analytics = add-on pago** → confirmar costo antes de migrar de Apify.
- **Delays:** IG ~48h, YT 2–3 días → no sirve para "métricas al instante" (el flujo de clips→Reels que mide a 10 días está OK).
- **Ventanas:** 89–90 días por llamada de insights (366 para la lista de posts); followers refrescan 1×/día.
- **TikTok per-video** y **referentes** → **Apify se queda**.
- **Velocity:** 15 posts/hora por cuenta (relevante para batch/lote).

---

### Fuentes
- docs.zernio.com (`llms-full.txt`, API reference, guides, platforms, webhooks, sdks, cli, mcp, pricing)
- OpenAPI spec v1.0.4 (`zernio.com/openapi.yaml`)
- SDKs oficiales generados del spec: `github.com/zernio-dev/zernio-php`, `docs.rs/zernio`
- Análisis del repo: `supabase/functions/publish-now`, `zernio-webhook`, `social_accounts`
