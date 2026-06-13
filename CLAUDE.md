# CLAUDE.md — ezequiellamas-landing

Repo-level context for any Claude Code session working in this directory.

## What this is

`ezequiellamas.com` — Ezequiel Lamas's personal brand hub. Three areas under one Vite SPA:

- `/` — landing (Spanish, dark theme `#0a0a0a` + accent `#c8ff00`, fonts Instrument Serif + DM Sans + JetBrains Mono).
- `/app/*` — authenticated React area connected to Supabase. Spec to follow.
- `/recursos`, `/recursos/:slug` — public DB-backed resource library. Spec to follow.
- `/eventos/*` — legacy static HTML decks (e.g. `/eventos/hackitba/`) served from `public/`.

## Stack

Vite 5 + React 18 + TypeScript + React Router 6 + Tailwind 3 + shadcn/ui + `@supabase/supabase-js` + `@tanstack/react-query` + Sonner + Lucide. Deploys to Vercel as a SPA via `vercel.json` rewrites.

This stack is deliberately identical to `C:\PC\Projects\ugc-studio-hub\.claude\worktrees\reverent-northcutt-18690e` so components, hooks, and primitives port copy-paste between repos. **Do not switch to Next.js without an explicit user OK** — reuse from the sister project is the whole point.

## Supabase

**Project: Personal Brand Hub.**

- `project_id` / ref: `zsbligbfsmdwbxcvoysu`
- API URL: `https://zsbligbfsmdwbxcvoysu.supabase.co`
- Region: `sa-east-1`
- Org: `elamasprojects`

### MCP routing — important

Two Supabase MCPs are loaded in this user's Claude config:

| MCP prefix | Behavior | Use it here? |
|---|---|---|
| `mcp__supabase__*` | Project-scoped to a different project (`uprfiwxfgooeqdfasggh`, an academic study app). Tools take no `project_id`. | **No.** It would write to the wrong DB. |
| `mcp__e44037be-429b-4d5f-97d9-b5341ff88822__*` | Management-API. Every tool requires `project_id`. | **Yes.** Always pass `project_id: "zsbligbfsmdwbxcvoysu"`. |

Examples:

```
mcp__e44037be-...__apply_migration({ project_id: "zsbligbfsmdwbxcvoysu", name, query })
mcp__e44037be-...__execute_sql({ project_id: "zsbligbfsmdwbxcvoysu", query })
mcp__e44037be-...__list_tables({ project_id: "zsbligbfsmdwbxcvoysu", schemas: ["public"], verbose: false })
mcp__e44037be-...__get_advisors({ project_id: "zsbligbfsmdwbxcvoysu", type: "security" })
mcp__e44037be-...__deploy_edge_function({ project_id: "zsbligbfsmdwbxcvoysu", ... })
mcp__e44037be-...__get_publishable_keys({ project_id: "zsbligbfsmdwbxcvoysu" })
```

The Supabase CLI is a complementary path:

```bash
npx supabase link --project-ref zsbligbfsmdwbxcvoysu
npx supabase migration new <name>
npx supabase db push
npx supabase gen types typescript --project-id zsbligbfsmdwbxcvoysu --schema public > src/lib/database.types.ts
```

Both paths target the same DB. Pick the MCP for in-session DDL; pick the CLI for type generation and local emulation.

### Other Supabase projects in the same org

- `begbxfleeyozpjinnpqo` — UGC Studio Platform. **Don't touch from here.** It's the prod DB for the sister project.

## Env vars

Two are required for the client:

```
VITE_SUPABASE_URL=https://zsbligbfsmdwbxcvoysu.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_VAPID_PUBLIC_KEY=B...   # M10 — Web Push (clave pública)
```

Local: `.env.local` (gitignored). Template: `.env.example`. On Vercel: set both in Project Settings → Environment Variables.

## Routing conventions

| Path | What | Auth |
|---|---|---|
| `/` | Landing (Spanish, bespoke aesthetic) | public |
| `/login`, `/auth/callback` | Magic-link auth scaffold | public |
| `/app` | Auth gate + role-based redirect | session required |
| `/app/admin/*` | Admin area (dashboard, ideas, formats, videos, calendar, publishing, assignments, resources, referentes, carousels, team) | requires `admin` role |
| `/app/admin/publishing` | Lista de scheduled posts con filtros | admin |
| `/app/admin/publishing/new` | Form para programar publicación (video o carrousel) | admin |
| `/app/admin/publishing/calendar` | Calendario mensual de publicaciones programadas | admin |
| `/app/admin/publishing/connections` | OAuth connect/disconnect IG/YT/TT + push permission | admin |
| `/app/admin/publishing/:id` | Detalle del scheduled_post + jobs por plataforma + acciones (cancelar, retry, mark-tt-done) | admin |
| `/app/admin/referentes` | (M14) Lista de creators de inspiración (CRUD admin) | admin |
| `/app/admin/referentes/:id` | (M14) Detalle del referente: links, nota, grid de virales scrapeados con análisis IA (transcript + concept_summary) | admin |
| `/app/editor/*` | Editor area (assignment queue, earnings, referentes read-only) | requires `editor` role |
| `/app/editor/referentes`, `/app/editor/referentes/:id` | (M14) Read-only de los referentes del admin (mismo grid de virales con guion + concepto) | editor |
| `/app/advisor/*` | Asesor area (videos to review, formats, referentes read-only) | requires `advisor` role |
| `/app/advisor/referentes`, `/app/advisor/referentes/:id` | (M14) Read-only de los referentes del admin asignado | advisor |
| `/recursos`, `/recursos/:slug` | Public resource library (DB-backed once SPEC lands) | public |
| `/eventos/*` | Static HTML decks, served from `public/eventos/...` | public |

## Roles model

`public.user_roles` uses an `app_role` enum (`admin | editor | advisor`) and a `has_role(_user_id, _role)` SECURITY DEFINER function used by every RLS policy. A user can have multiple rows (e.g. admin + advisor) — the `RoleRedirect` on `/app` picks the highest-priority area (admin > editor > advisor).

**Bootstrap the first admin** (once Ezequiel has logged in via magic link at least once):

```sql
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
from auth.users
where email = 'ezequiellamas@gmail.com'
on conflict do nothing;
```

Run via `mcp__e44037be-...__execute_sql({ project_id: "zsbligbfsmdwbxcvoysu", query: ... })`. After that, all subsequent invitations go through `/app/admin/team` (which calls the `invite-user` Edge Function — verifies the caller is admin, calls `auth.admin.inviteUserByEmail`, assigns the role).

## Database — schema overview

Migrations applied (in order):

| Version | Name | Adds |
|---|---|---|
| `m1_roles_auth_foundation` | M1 | `app_role` enum, `profiles`, `user_roles`, `has_role()`, `set_updated_at()`, `handle_new_user()` trigger |
| `m3_formats` | M3 | `formats` (CRUD by admin) |
| `m2_ideas_scripts_audio` | M2 | `audio_uploads`, `scripts`, `broll_suggestions`, `create_script_with_brolls()` RPC, `audio-ideas` storage bucket + RLS |
| `m4_videos_metrics` | M4 | `videos`, `video_metrics_history`, `calculate_video_multiplier()` trigger, `video-thumbnails` storage bucket (public read) |
| `m4_fix_public_bucket_listing` | M4 patch | drops broad SELECT policy on `video-thumbnails` storage objects (Supabase advisor flagged it) |
| `m6_editor_workflow` | M6 | `editor_assignments`, `video_submissions`, `corrections`, `notifications` tables; RLS for admin/editor; editor reads scripts + brolls via assignment join; notifications added to supabase_realtime publication |
| `m7_advisor_feedback` | M7 | `advisor_assignments` (admin↔advisor pivot), `advisor_feedback` (threaded comments); RLS for admin/advisor; advisor read of formats/videos/scripts/brolls now gated by active `advisor_assignments` |
| `m4b_videos_apify_tracking` | M4b | Adds `videos.apify_short_code`, `videos.last_scraped_at`, `videos.last_scrape_error` for the Apify Instagram sync; adds INSERT policy on `video_metrics_history` so admins can write snapshots of their own videos |
| `m4c_profile_social_handles` | M4c | Adds `profiles.instagram_handle`, `profiles.youtube_handle`, `profiles.tiktok_handle` (all nullable) so each admin can configure which IG/YT/TT account to discover their unloaded videos from. |
| `m5_video_posts_split` | M5 | **Major refactor.** Splits the old flat `videos` row into two tables: `videos` (logical video — title, transcript, multiplier, performance_tier) and `video_posts` (one row per platform — source_url, apify_short_code, all metrics, thumbnail, posted_at, raw). Adds `video_platform` enum. Backfills existing rows 1-1. `video_metrics_history` now references `video_post_id` instead of `video_id`. Multiplier trigger moves to `video_posts` and uses `videos.views_total_aggregate` (sum of all platform views). Adds `videos.transcript / transcript_status / transcript_error / transcript_language` columns for Whisper output. |
| `m8_resources` | M8 | `resources` (DB-backed library para `/recursos`). |
| `m9_carousels` | M9 | `carousels`, `carousel_slides`, `carousel_render_jobs` (carruseles AI con templates T1Cover/T2Feature/T3Grid/T4VS/T5CTA, renderizados a imágenes en bucket `carousel-renders`). |
| `m10_publishing_foundation` | M10 | **Publishing**: `social_accounts`, `scheduled_posts`, `publish_jobs`, `web_push_subscriptions`, `oauth_states`. Enums: `scheduled_post_status`, `scheduled_post_asset_kind`, `publish_job_status`. RLS por owner. Trigger `set_updated_at` en social_accounts/scheduled_posts/publish_jobs. Bucket nuevo `videos-final` (privado, MP4 listo para publicar). Realtime publica `publish_jobs` y `scheduled_posts`. |
| `m11_publishing_cron` | M11 | Habilita `pg_net` + `pg_cron`. Crea función `dispatch_scheduler_tick()` (security definer, search_path pinned) que lee `vault.decrypted_secrets` (`scheduler_service_role_key`, `project_url`) y hace `net.http_post` a la edge function `scheduler-tick`. Schedule: `* * * * *` (cada minuto). Si los secrets no están seteados en Vault, la función es no-op. |
| `m12_publishing_bunny_stream` | M12 | Reemplaza Supabase Storage por **Bunny Stream** para uploads de videos en `scheduled_posts`. Agrega `bunny_video_id` + `bunny_library_id` columnas. Cambia el CHECK constraint: video kind ahora requiere `bunny_video_id` (en vez de `video_storage_path`). `video_storage_path` queda nullable y deprecated. Index parcial en `bunny_video_id` para lookups rápidos. |
| `m13_publishing_transcript` | M13 | Agrega columnas `transcript`, `transcript_language`, `transcript_status`, `transcript_error` a `scheduled_posts`. Cache del transcript de Whisper para que `generate-captions` no re-pague Whisper en cada regeneración. `transcript_status` valores: `idle | pending | done | failed | too_large`. Index parcial en `pending`. |
| `m10_publish_jobs_owner_write_policies` | M10 patch | Agrega INSERT y UPDATE RLS policies a `publish_jobs` (owner del parent `scheduled_post`). M10 original solo tenía SELECT, lo que rompía el create-scheduled-post flow desde el cliente y `markJobPublished` (TikTok Upload Mode + Manual). DELETE no hace falta porque el FK es ON DELETE CASCADE. |
| `m15_scheduled_posts_supabase_storage_video` | M15 | Re-habilita Supabase Storage como **alternativa a Bunny Stream** para upload de videos. Relaja el CHECK constraint `scheduled_posts_asset_check`: para `asset_kind='video'` ahora exige `bunny_video_id IS NOT NULL` **OR** `video_storage_path IS NOT NULL` (en vez de solo Bunny). Bunny sigue siendo default en la UI; Supabase es fallback cuando Bunny falla. El bucket `videos-final` (privado, 500MB limit, MIME whitelist mp4/mov/webm) y sus RLS policies (owner-of-folder INSERT/SELECT/UPDATE/DELETE) ya existían desde M10 — solo el CHECK faltaba. |
| `m14_referents` | M14 | `referents` (banco de creators inspiración). Columnas: `name`, `note`, `instagram_url/handle`, `youtube_url/handle`, `tiktok_url/handle`, `position`, `last_scraped_at`, `last_scrape_error`. CHECK: al menos un URL. RLS triple — admin manages own; editor lee todos vía `has_role('editor')`; advisor lee vía `advisor_assignments` activo (mismo patrón que `formats`). Trigger `set_updated_at`. |
| `m14b_referent_videos` | M14b | `referent_videos` (videos virales scrapeados de los referentes). FK a `referents` con `on delete cascade`. Reusa enum `video_platform`. Columnas de scrape (`source_url`, `apify_short_code`, `posted_at`, `title`, `caption`, `thumbnail_url`, `views_total`, `likes`, `comments`, `shares`, `saves`, `video_duration`, `raw`, `last_scraped_at`, `metrics_updated_at`) + columnas de análisis IA (`transcript`, `transcript_language`, `transcript_status`, `transcript_error`, `concept_summary`, `concept_status`, `concept_error`). Indexes: unique `(referent_id, source_url)`, unique parcial `(referent_id, platform, apify_short_code)`, btree `(referent_id, views_total desc)`. RLS triple igual que `referents`. |
| `m16_shapes` | M16 | `shapes` (catálogo de **estructuras narrativas** de los videos: hook → beats → CTA). Ortogonal a `formats` (que describe CÓMO está grabado). Misma forma que `formats`: columnas `name`, `description`, `example_url`, `position`, RLS triple (admin manages own / editor lee todos / advisor lee via active assignment), trigger `set_updated_at`. UI: `/app/admin/formats` (FormatsList.tsx + ShapesSection.tsx en la misma página) y read-only en `/app/advisor/formats`. Seed inicial: "Antes / Después", "Stack tour", "Hot take + demo". |
| `m17_series_and_shape_links` | M17 | `series` (catálogo de **narrativas multi-parte** que agrupan videos: parte 1, 2, 3...). Misma forma que `formats`/`shapes` con la misma RLS triple. Linkea scripts y videos a shape + series + part_number: agrega `shape_id uuid`, `series_id uuid`, `part_number integer` (todos nullable, FK con `on delete set null`) en `public.scripts` y `public.videos`. Indexes `(series_id, part_number)` en ambas. |
| `m17b_create_script_rpc_with_shape_series` | M17b | Recrea `create_script_with_brolls` con 3 nuevos params al final: `_shape_id`, `_series_id`, `_part_number` (todos default NULL). Persiste estos campos en la fila nueva de `scripts`. |
| `m18_videos_zernio_sync` | M18 | **Sync de videos nativo vía Zernio** (reemplaza el discovery de Apify). Agrega `videos.zernio_late_post_id` (text; agrupa cross-posts por el `latePostId` de Zernio; unique parcial `(owner_id, zernio_late_post_id)`) y `video_posts.platform_post_id` (text; id nativo de la plataforma; index parcial `(platform, platform_post_id)`). Crea `dispatch_sync_videos_zernio_tick()` (security definer, clona `dispatch_zernio_analytics_tick`) + `cron.schedule('sync-videos-zernio', '0 12 * * *')` = **09:00 America/Argentina/Buenos_Aires**. |
| `create_post_predictions` | M19 | **Predicción de viralidad.** `post_predictions` (una fila por `(scheduled_post, plataforma, model_version)`): bloque PREDICHO (`predicted_virality_score` 0-100, `predicted_tier`, `predicted_views_point/low/high`, `confidence`, `key_drivers`/`risks`/`referent_signals` jsonb, `reasoning`, snapshots `baseline_/referent_/input_/calibration_`) + bloque REAL/EVAL (`actual_views`, `actual_tier`, `abs_pct_error`, `signed_pct_error`, `within_range`, `score_error`, `horizon_label`, `evaluated_at`). Enum nuevo `virality_tier` (`outlier/5x/3x/normal/underperform`). RLS owner-based. View `post_prediction_overview` (rollup por post, `security_invoker`). El tier es RELATIVO a la mediana del creador por plataforma (mismos umbrales 3x/5x/7x que `calculate_video_multiplier()`). |
| `prediction_eval_cron` | M19 | `dispatch_prediction_eval_tick()` (SECURITY DEFINER, lee `vault.decrypted_secrets`, no-op si faltan) + `cron.job` `prediction-eval-tick` a `37 */12 * * *` (reusa el slot de 12h, offset del de zernio) → `net.http_post` a `evaluate-prediction` con `{sweep:true, max:100}`. Finaliza predicciones maduras (post ≥7d publicado) contra las views reales. |

Buckets:

| Bucket | Visibility | Path | Used by |
|---|---|---|---|
| `audio-ideas` | private | `{user_id}/{uuid}.{ext}` | M2 — admin-of-own-folder only |
| `video-thumbnails` | public | `{user_id}/{video_post_id}.{ext}` | M5 — `scrape-video` downloads the platform CDN thumbnail and uploads here for permanence (CDN URLs expire). Anyone reads via public URL (no listing) |
| `carousel-renders` | private | `{owner_id}/{carousel_id}/{slide_index}.{ext}` | M9 — slides renderizados a imagen. Lee `publish-now` para crear children del carousel IG vía signed URLs. |
| `videos-final` | private | `{owner_id}/{uuid}.{ext}` | M10 + M15 — **Re-habilitado en M15** como alternativa a Bunny Stream cuando Bunny falla. 500MB limit, MIME whitelist (mp4/mov/webm). Cliente sube directo via `supabase.storage.upload()` con RLS owner-of-folder. `publish-now` arma signed URL (24h TTL) para Zernio. `transcribe-bunny-video` descarga via service-role para Whisper. **Pendiente:** automatización para borrar videos una vez publicados (storage limitado de Supabase). |

RPCs (security definer):

| Name | Purpose |
|---|---|
| `has_role(_user_id, _role)` | RLS helper |
| `create_script_with_brolls(...)` | Atomically inserts a script + its broll_suggestions for the calling admin (`auth.uid()`) |
| `calculate_video_multiplier()` (trigger function) | Fires on `video_posts` insert/delete/update of `views_total`. Recomputes the parent `videos.views_total_aggregate` (sum of all platforms), then compares against avg of other `videos.views_total_aggregate` for the same owner with at least one post in the last 90 days. Tiers: `>=7×` outlier, `>=5×` 5×, `>=3×` 3×, else normal. |

## Edge Functions (in this project)

Deployed via `mcp__e44037be-...__deploy_edge_function({ project_id: "zsbligbfsmdwbxcvoysu", ... })`. Auto-injected env: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Custom env (set via Supabase dashboard → Project Settings → Edge Functions secrets):

| Function | Verify JWT | Hace |
|---|---|---|
| `create-user` | yes | Admin crea miembro al toque. Llama `auth.admin.createUser({ email, password: "123456", email_confirm: true })` + inserta en `user_roles`. Si role es `advisor`, también inserta `advisor_assignments(admin_id=caller, advisor_id=created, active=true)`. Idempotente: si el email ya existe, asigna el rol al user existente. |
| `send-access-email` | yes | Admin manda mail brandeado vía Resend con email + password (`123456`) + link a `${APP_URL}/login` + instrucciones de instalar la app como PWA en iPhone/Android. Recibe `{ user_id }`, lee email de `profiles`, manda con `FROM_EMAIL` (default `Ezequiel Lamas <hola@updates.ezequiellamas.com>`). |
| ~~`invite-user`~~ | yes | **Deprecated** (reemplazada por `create-user` + `send-access-email`). Sigue desplegada pero ya no se llama desde el cliente. Borrarla manualmente desde el dashboard de Supabase cuando se quiera limpiar. |
| `transcribe-audio` | yes | Whisper-1 (OpenAI). Recibe `{ audio_upload_id }`, baja del bucket, transcribe, guarda en `audio_uploads.transcript`. |
| `generate-script` | yes | Claude Sonnet 4.6 con tool_use. Recibe `{ audio_upload_id?, raw_concept?, format_id? }`, transcribe si hace falta, inyecta últimos 5 scripts como few-shot, devuelve `{ script_id }`. |
| `send-notification` | yes | Inserta en `notifications` (idempotente vía dedupe_key) + opcionalmente manda mail vía Resend con templates inline (assignment_created / correction_requested / submission_approved / submission_uploaded / feedback_received). Admin puede notificar a cualquiera; editor solo a admins. |
| `scrape-video` | yes | (M5) Apify multi-plataforma. Recibe `{ video_post_id }` (preferido) o `{ video_id }` (legacy: pickea el primer post syncable del video). Routea por `platform`: IG (`apify/instagram-scraper`), YT (`streamers/youtube-scraper`), TT (`clockworks/tiktok-scraper`). Mapea ~20 campos al `video_posts` (views/likes/comments/shares/saves TT/caption/thumbnail/posted_at/duration/dimensions/owner/hashtags/mentions/music). **Descarga el thumbnail del CDN y lo sube al bucket `video-thumbnails/{user_id}/{video_post_id}.jpg`** (URL permanente). Si YT devuelve title y la fila `videos` no tiene, lo setea. Inserta snapshot en `video_metrics_history` con `video_post_id`. Trigger del multiplier corre solo. |
| `sync-videos-zernio` | yes (o service-role) | (M18) **Sync total nativo — reemplaza el discovery de Apify** (botón "Sincronizar" en `/app/admin/videos` + cron diario). Recibe `{}`. Service-role (cron) o JWT admin. Pagina `GET https://zernio.com/api/v1/analytics?source=all` (trae TODOS los videos de las cuentas conectadas vía API oficial de cada plataforma, incluso los posteados nativamente fuera de la app — `isExternal:true`). Agrupa cross-posts por `latePostId`; el contenido nativo (sin `latePostId`) se clusteriza por tiempo+hook de caption. Reconcilia contra `video_posts` existentes (match por `(platform, apify_short_code)`), **fusiona fragmentos** (reparenta posts al video canónico, borra los vacíos), upsert `video_posts on (video_id, platform)` con métricas + `platform_post_id`, persiste thumbnails al bucket `video-thumbnails`, snapshot en `video_metrics_history`. El trigger del multiplier corre solo. Devuelve `{ ok, imported, merged, synced, videos, discovered, errors[] }`. |
| ~~`discover-and-import-videos`~~ | yes | (M5, **deprecado por `sync-videos-zernio` en M18**) Bulk discovery vía Apify. Recibe `{ days = 7 }`, lee handles del profile (`instagram_handle/youtube_handle/tiktok_handle`), llama Apify para listar últimos posts de cada perfil, dedupea contra `video_posts.apify_short_code`/`source_url`, fuzzy-merge cross-platform por jaccard de caption. Sigue desplegado pero ya no se llama desde el cliente. |
| `transcribe-video` | yes | (M5+) Transcripción multi-platform. Recibe `{ video_id }` (pickea IG > YT > TT) o `{ video_post_id }`. **YouTube:** parsea los SRT auto-generados que vienen en `raw.subtitles[]` (gratis, instantáneo, prefiere `es-auto > es > any-auto`). **IG/TT:** descarga `raw.audioUrl` (IG) o `raw.videoUrl`/`mediaUrls[0]`/`videoMeta.playApi` (TT) y manda a OpenAI Whisper-1 con `language=es`. Si el `raw` es >4h o falta, re-scrapea. Guarda `videos.transcript` + `transcript_status='done'` + `transcript_language`. |
| `link-video-platform` | yes | (M5) Suma una nueva plataforma a un video existente. Recibe `{ video_id, source_url }`, detecta plataforma del URL, valida ownership, valida que no esté ya vinculada (unique index sobre `(video_id, platform)`), inserta `video_posts` vacío y dispara internamente `scrape-video` para poblarlo. Devuelve `{ ok, video_id, post }` con la fila populada. |
| `generate-carousel` | yes | (M9) Claude genera carrousel a partir de concept + slide_count + hook_angle + cta_keyword + mode (static/animated). Inserta `carousels` y `carousel_slides` con templates T1-T5. |
| `regenerate-carousel-slide` | yes | (M9) Regenera un slide específico con instruction opcional. |
| ~~`oauth-start`~~ (legacy nativo) | yes | (M10 v1, **deprecated post-Zernio**) Versión nativa con FB/Google/TikTok OAuth directo. Sigue desplegada pero ya no se usa. Pendiente de reescribir para Zernio. |
| ~~`oauth-callback`~~ (legacy nativo) | yes | (M10 v1, **deprecated post-Zernio**) Versión nativa. Pendiente de reescribir para Zernio. |
| `publish-now` | yes (o service-role) | (M10 v2 + M12 + M15, **Zernio + Bunny/Supabase**) Recibe `{ scheduled_post_id, platform? }`. Si user-JWT valida ownership; si service-role (cron) bypassa. Carga jobs `pending`/`failed`, marca `in_progress`, construye `mediaItems[]`: **video con `video_storage_path` (Supabase) → signed URL del bucket `videos-final` con TTL 24h** (toma precedencia si está seteado); **video con `bunny_video_id` (Bunny) → CDN URL `https://{BUNNY_CDN_HOSTNAME}/{bunny_video_id}/play_720p.mp4`** (la ruta `/original` requiere "Early-Play" en la library, off por default → 403); **carousel → signed URLs (60min TTL) del bucket `carousel-renders` por slide ordenados por `index`**. Arma `platforms[]` con los `zernio_account_id` de `social_accounts.meta`, llama `POST https://zernio.com/api/v1/posts` con `publishNow: true`. Devuelve `{ ok, zernio_post_id, results }`. **Per-platform overrides** vía `platformSpecificData`: IG video → `mediaType: "reel"`; YT → `title` + `tags` + `privacy: "public"` + auto `#Shorts` si caption contiene `#shorts`. Stamp del `zernio_post_id` en `publish_jobs.payload` para que `zernio-webhook` los matchee. Las filas en `videos`/`video_posts` se crean cuando el webhook confirma éxito (no acá). |
| `zernio-webhook` | NO (signature-validated) | (M10 v2) Endpoint público `https://zsbligbfsmdwbxcvoysu.functions.supabase.co/zernio-webhook`. Recibe eventos: `post.published / failed / partial / cancelled / scheduled / recycled` + `account.connected / disconnected`. Valida `X-Zernio-Signature` (HMAC-SHA256 del raw body) si `ZERNIO_WEBHOOK_SECRET` está seteado; si no, acepta sin validar y loguea warning. Por cada job matcheado vía `payload->>zernio_post_id`, extrae status per-plataforma (intenta varios shapes del payload — el formato exacto no está documentado), updatea `publish_jobs.status` + `provider_post_url` + `provider_post_id`. En éxito, crea filas stub en `videos` + `video_posts` (idempotente: dedupe por `source_url`). Roll-up del status del scheduled_post: `published / partial / failed`. Dispara notification + push. |
| `bunny-create-video` | yes | (M12) Recibe `{ filename, title? }`. Crea un video vacío en Bunny Stream library vía `POST https://video.bunnycdn.com/library/{LIB}/videos`. Genera firma TUS (sha256 de `lib_id + api_key + expiration + video_id`) con TTL 1h. Devuelve `{ video_id, library_id, upload_url, auth_signature, auth_expiration_time, cdn_url, hls_url, cdn_hostname }`. **`cdn_url` apunta a `/play_720p.mp4`** (MP4 fallback encoded, disponible una vez Bunny termina de transcodear con status=4); `hls_url` apunta a `/playlist.m3u8` (HLS, disponible casi inmediatamente). Cliente usa `tus-js-client` directo a Bunny. |
| `transcribe-bunny-video` | yes (o service) | (M13 + M15) Recibe `{ scheduled_post_id?, bunny_video_id?, video_storage_path?, language?, force? }`. Si `scheduled_post_id` y `transcript_status='done'` → devuelve cached. **Provider Supabase**: si `video_storage_path` (o el post lo tiene) → descarga el blob del bucket `videos-final` via service-role; si >25MB → `too_large` + 422. **Provider Bunny**: pollea status via `GET /library/{LIB}/videos/{VID}` hasta `status=4` con timeout 60s, después HEAD a `/play_720p.mp4`. Si timeout → 503 retryable; encode error (5/6) → 502. POST multipart a OpenAI Whisper-1 con `response_format=verbose_json`, cachea en `scheduled_posts.transcript / transcript_language / transcript_status='done'`. En 4xx/5xx del HEAD loguea diagnostics (server, x-cache, content-type). Devuelve `{ transcript, language, duration_seconds, cached }`. |
| `generate-captions` | yes (o service) | (M13 + M15) Recibe `{ scheduled_post_id?, bunny_video_id?, video_storage_path?, transcript?, platforms[], format_id?, force_regenerate? }`. Si no llega transcript inline ni cache, invoca internamente `transcribe-bunny-video` propagando ambos identificadores de video (Bunny o Supabase). Si `format_id` seteado, lee `formats(name, description)` y lo inyecta en el system prompt. Llama Claude Sonnet 4.6 con tool `emit_captions` (input_schema con `caption_default, captions{ig,yt,tt}, youtube_title, hashtags[]`). Sanitiza hashtags (lowercase, alfanuméricos), trunca title a 100 chars, filtra captions a las plataformas pedidas. Devuelve `{ caption_default, captions, youtube_title, hashtags, used_format }`. |
| `register-push-subscription` | yes | (M10) Recibe `{ endpoint, p256dh, auth, user_agent? }`. Upsert en `web_push_subscriptions` por `endpoint`. |
| `send-push` | NO (service-role only) | (M10) Recibe `{ user_id, title, body, url? }`. Verifica que el caller sea service-role (bearer o apikey). Lee `web_push_subscriptions` del user, manda con `npm:web-push@3.6.7` usando VAPID. Cleanup automático de 404/410 (suscripciones expiradas). |
| `scheduler-tick` | NO (service-role only) | (M10/M11) Invocado cada minuto por `pg_cron` vía `dispatch_scheduler_tick()`. (1) Manda recordatorios T-30min (insert `notifications` + push, dedupe por `pub:remind:{post_id}`). (2) Selecciona `scheduled_posts` con `scheduled_at <= now()` y `status='scheduled'`, hace CAS a `publishing` (atomic), invoca `publish-now` por cada uno. (3) Cleanup de `oauth_states` expirados via RPC. |
| ~~`scrape-instagram-video`~~ | yes | **Deprecated** (reemplazada por `scrape-video`). Sigue desplegada pero ya no se llama desde el cliente. Borrarla manualmente desde el dashboard de Supabase cuando se quiera limpiar. |
| `scrape-referent-videos` | yes | (M14) Apify multi-plataforma para referentes. Recibe `{ referent_id }`. Lee `referents` row (RLS valida ownership), llama Apify por cada handle no-null (`apify~instagram-scraper`, `streamers~youtube-scraper` con `subtitles: true`, `clockworks~tiktok-scraper`). Upsert en `referent_videos` por `(referent_id, source_url)`. Stampa `last_scraped_at` + `last_scrape_error` en `referents`. Devuelve `{ ok, scraped: { instagram, youtube, tiktok }, errors[] }`. **No hace cross-platform fuzzy merge** (cada video del referente es independiente). Reusa `callApify`/`stripHandle`/etc de `discover-and-import-videos`. |
| `analyze-referent-video` | yes | (M14) Toma un `referent_videos` row y le saca transcript + concept_summary. Recibe `{ referent_video_id, force? }`. Si `transcript_status='done'` y `concept_status='done'` y `!force` → devuelve cached. Si no: marca `pending`, calcula transcript (YT: parsea SRT del `raw.subtitles[]` con prioridad `es-auto > es > any-auto`; IG: descarga `raw.audioUrl`; TT: descarga `raw.videoUrl`/`mediaUrls[0]`/`videoMeta.playApi`). Si >25MB Whisper rechaza con 422. Manda audio a OpenAI Whisper-1 con `response_format=verbose_json`. Cachea transcript. Después llama Claude Sonnet 4.6 con tool `emit_concept` (schema: `hook, format, angle, cta, summary`); guarda `concept_summary`. En errores marca `*_status='failed'` + `*_error=msg`. |
| `predict-virality` | yes (o service-role) | (M19) Pronóstico de viralidad por plataforma (IG/TT/YT) para un `scheduled_post` **NO publicado**. Claude Sonnet 4.6 (`max_tokens: 4000` — con 2000 truncaba el tool_use) con tool forzado `emit_prediction`. Contexto = **SOLO datos propios de la DB**: (A) baselines del creador por plataforma (mediana/p25/p75/max de `video_posts.views_total`, calculados en JS), (B) few-shot de sus videos pasados con contenido (hook/format/shape/transcript) + métricas, (C) corpus de `referent_videos` normalizado por la **mediana de cada referente** (`rel_lift` → señal de ADN viral transferible; `n>=3` por referente o fallback a mediana global de la plataforma), (D) calibración de errores de predicciones ya evaluadas. Las views absolutas se anclan al historial propio, NO a las views del referente. `predicted_tier` se calcula server-side (`views_point/median`). Upsert idempotente en `post_predictions` por `(scheduled_post, plataforma, model_version='virality-v1')`; `force` re-predice. Auth dual: JWT de usuario con ownership check del `scheduled_post`, o service-role vía `getJwtRole` (la vault key es un JWT legacy que NO matchea `SUPABASE_SERVICE_ROLE_KEY` por string). |
| `evaluate-prediction` | yes (o service-role) | (M19) Captura el resultado REAL y calcula el error (**sin LLM**, aritmética pura). Modos: `{scheduled_post_id}` / `{video_post_id}` / `{prediction_id}` / `{sweep:true, max?}`. Solo evalúa posts `published`/`partial` (guard anti-falsos-matches). Resuelve el `video_post` realizado en cascada: `publish_jobs.video_post_id` → match normalizado `provider_post_url`↔`source_url` → cercanía `posted_at` ±3d (porque hoy el webhook **no** popula `video_post_id`). `actual_views` = último snapshot de `video_metrics_history` (fallback `video_posts.views_total`). `actual_tier` con la `baseline_snapshot.median` guardada en la predicción (mismo ancla que `predicted_tier`). Errores: `abs/signed_pct_error`, `within_range`, `score_error`. **Gate de madurez**: `status='evaluated'` solo si el post tiene ≥7d publicado; antes escribe `actual_views` provisional sin flipear (no contamina la calibración). Cierra el loop: la capa de calibración de `predict-virality` lee las filas `evaluated`. Invocada on-demand (botón "Re-evaluar") y por el cron `prediction-eval-tick` (sweep cada 12h). |

Custom secrets needed:

| Var | Used by | Required from |
|---|---|---|
| `APP_URL` | `send-access-email`, `send-notification`, `invite-user` (legacy) | M1 — `http://localhost:8080` para dev, `https://ezequiellamas.com` (o URL Vercel) para prod |
| `RESEND_API_KEY` | `send-notification`, `send-access-email` | M6 + Equipo |
| `FROM_EMAIL` | `send-notification`, `send-access-email` | Equipo — `Ezequiel Lamas <hola@updates.ezequiellamas.com>` (dominio verificado en Resend). Si no está seteado, default es ese mismo string. |
| `OPENAI_API_KEY` | `transcribe-audio`, `generate-script` (Whisper) | M2 ✓ — **swap from Groq**: el plan original mencionaba Groq Whisper, pero solo está configurado OPENAI_API_KEY. Se usa OpenAI Whisper-1. |
| `ANTHROPIC_API_KEY` | `generate-script` (Claude Sonnet 4.6) | M2 ✓ |
| `APIFY_API_KEY` | `scrape-video` (todas las ramas) | M4b ✓ — token personal de cuenta de Apify, una sola key sirve para los 3 actores (`apify/instagram-scraper`, `streamers/youtube-scraper`, `clockworks/tiktok-scraper`). |
| ~~`APIFY_API_KEY_INSTAGRAM` / `_YOUTUBE` / `_TIKTOK`~~ | fallback legacy | Si `APIFY_API_KEY` no está seteado, la edge function cae a estos por compatibilidad. Una vez que `APIFY_API_KEY` esté funcionando, podés borrarlos del dashboard. |
| `GEMINI_API_KEY`, `SUBMAGIC_API_KEY`, `ELEVENLABS_API_KEY` | reservados Fase 2 | — |
| `ZERNIO_API_KEY` | `publish-now` | M10 v2 — API key de Zernio (https://zernio.com). Una sola key cubre IG/YT/TT. Plan Free (20 posts/mes) o Build ($16/mes, 120 posts/mes). |
| `ZERNIO_WEBHOOK_SECRET` (opcional) | `zernio-webhook` | M10 v2 — Si está seteado, valida firma HMAC-SHA256. Si no, acepta sin validar (deuda técnica para un solo user, OK para MVP). Generar con `openssl rand -hex 32` y pegar en ambos lados (Zernio webhook config + Supabase secret). |
| `BUNNY_LIBRARY_ID`, `BUNNY_LIBRARY_KEY`, `BUNNY_CDN_HOSTNAME` | `bunny-create-video`, `publish-now` | M12 — Bunny Stream library credentials. `LIBRARY_ID` numérico, `LIBRARY_KEY` es la API key del library, `CDN_HOSTNAME` es el pull zone hostname (ej `vz-xxxxxx.b-cdn.net`). Una sola library cubre todos los videos del proyecto. |
| ~~`META_APP_ID`, `META_APP_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `OAUTH_REDIRECT_BASE`~~ | nativo legacy | M10 v1 — **Deprecated post-Zernio**. Solo si decidís volver a la integración nativa (commit `9181a78` en git). Pueden borrarse del dashboard de Supabase. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | `send-push` | M10 — Web Push. Generar con `npx web-push generate-vapid-keys`. La pública también va al cliente como `VITE_VAPID_PUBLIC_KEY`. `VAPID_SUBJECT` default: `mailto:hola@ezequiellamas.com`. |

## Style conventions

- **Landing components** (`src/components/landing/*`) use the bespoke CSS from `src/index.css` (class names like `hero`, `phil-card`, `career-item`). The landing's CSS is scoped under `body.landing` — `src/pages/Landing.tsx` adds that class on mount and removes it on unmount, so the global resets and styles only apply on the landing route. **Don't replace the landing's visual system with shadcn defaults.**
- **`/app` and `/recursos`** use Tailwind + shadcn/ui. Copy primitives from `C:\PC\Projects\ugc-studio-hub\.claude\worktrees\reverent-northcutt-18690e\src\components\ui\*` on demand into `src/components/ui/`. Don't bulk-import.
- shadcn HSL CSS vars live in `src/index.css` under `:root` (dark theme). Landing brand vars are prefixed `--ll-*` to avoid colliding with `--border`, `--accent`, etc.

## Dev commands

```bash
npm run dev        # Vite dev server on http://localhost:8080
npm run build      # Production build → dist/
npm run preview    # Preview the production build
npm run lint       # ESLint
```

## Component reuse

Sister project: `C:\PC\Projects\ugc-studio-hub\.claude\worktrees\reverent-northcutt-18690e`. Same Vite + React + Tailwind + shadcn stack. Before building any UI primitive (button, dialog, card, dropdown, form field, table, sheet, etc.) here, check that directory first — copy and adapt rather than reinvent.

Specifically useful:
- `src/components/ui/*.tsx` — shadcn primitives, all configured.
- `src/lib/utils.ts` — `cn()` already mirrored here.
- `src/components/auth/*Route.tsx` — auth guard patterns.
- `src/components/layout/*Layout.tsx` — sidebar/topbar layout patterns.
- `src/hooks/useAuth.ts` — auth hook (this repo's `useSession.ts` is a simpler version).

## Publishing setup checklist (M10/M11) — Zernio path

Una sola vez, cuando se quiera activar la publicación automática:

1. **Crear cuenta en Zernio** (https://zernio.com/signup) y conectar IG, YouTube, TikTok desde su dashboard (1 click-to-connect por plataforma). **No** hace falta Meta App, Google Cloud project, ni TikTok Developer App — Zernio maneja todo eso de su lado. La cuenta IG sí tiene que ser Business/Creator linkeada a una FB Page (es requerimiento de Meta, no de Zernio).

2. **Generar API key** en Zernio dashboard → Settings → API Keys. Setear `ZERNIO_API_KEY` en Supabase Edge Functions secrets.

2.5. **Bunny Stream**: crear cuenta en bunny.net → Stream → Create Library. Setear `BUNNY_LIBRARY_ID` (numérico), `BUNNY_LIBRARY_KEY` (API key del library) y `BUNNY_CDN_HOSTNAME` (pull zone, ej `vz-xxxxx.b-cdn.net`) en Supabase secrets. **En la library → Encoding Settings activar "MP4 Fallback"** (lo necesitamos para servir `/{videoId}/play_720p.mp4`, que es la URL pública que pasamos a Zernio y a Whisper). Dejar **"Early-Play" desactivado** — la ruta `/{videoId}/original` no se usa porque expone el archivo crudo y devuelve 403 cuando Early-Play está OFF.

3. **Crear webhook** en Zernio dashboard apuntando a `https://zsbligbfsmdwbxcvoysu.functions.supabase.co/zernio-webhook`. Suscribir a: `post.published / post.failed / post.partial / post.cancelled / post.scheduled / post.recycled / account.connected / account.disconnected`. (Opcional pero recomendado: generar webhook secret con `openssl rand -hex 32` y pegarlo en Zernio + Supabase como `ZERNIO_WEBHOOK_SECRET`.)

4. **Seedear `social_accounts`** con los 3 accountIds que devuelve Zernio (visibles en su dashboard). Una sola vez vía SQL:
   ```sql
   insert into public.social_accounts
     (owner_id, platform, external_account_id, display_name, access_token, status, meta)
   values
     ('<owner_uuid>', 'instagram', '<ig_account_id>', '@ezequiellamass', 'zernio', 'connected',
      '{"provider":"zernio","zernio_account_id":"<ig_account_id>","zernio_profile_id":"<profile_id>"}'::jsonb),
     -- ... y lo mismo para tiktok y youtube
   on conflict (owner_id, platform) do update set ...;
   ```

5. **Generar VAPID keys** (push):
   ```bash
   npx web-push generate-vapid-keys
   ```
   Setear `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` en Edge Functions secrets. Setear `VITE_VAPID_PUBLIC_KEY` (la pública) en `.env.local` y en Vercel.

6. **Vault secrets** para que el cron pueda invocar `scheduler-tick`:
   ```sql
   select vault.create_secret('https://zsbligbfsmdwbxcvoysu.supabase.co', 'project_url');
   select vault.create_secret('<SERVICE_ROLE_KEY_AQUI>', 'scheduler_service_role_key');
   ```
   Sin esto, `dispatch_scheduler_tick()` es no-op.

7. **Activar push**: en cualquier página de admin aparece el banner "Activar notificaciones". Tocar Activar.

## Out of scope until the SPEC arrives

- Schema for `/app` (tables, RLS, edge functions).
- Schema for `/recursos` (resource model, categories, search).
- Final auth UX (provider choice, onboarding, profile page).
- Pre-rendering / SSG for SEO on `/` and `/recursos/:slug` (`vite-plugin-prerender` or migrate to `vike`). Not configured yet.
- Vercel deploy + DNS cutover for `ezequiellamas.com`.
- CI (GitHub Actions for lint/build on PR).
