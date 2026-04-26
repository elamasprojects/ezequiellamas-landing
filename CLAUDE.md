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
```

Local: `.env.local` (gitignored). Template: `.env.example`. On Vercel: set both in Project Settings → Environment Variables.

## Routing conventions

| Path | What | Auth |
|---|---|---|
| `/` | Landing (Spanish, bespoke aesthetic) | public |
| `/login`, `/auth/callback` | Magic-link auth scaffold | public |
| `/app` | Auth gate + role-based redirect | session required |
| `/app/admin/*` | Admin area (dashboard, ideas, formats, videos, calendar, assignments, team) | requires `admin` role |
| `/app/editor/*` | Editor area (assignment queue, earnings) | requires `editor` role |
| `/app/advisor/*` | Asesor area (videos to review, formats) | requires `advisor` role |
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

Buckets:

| Bucket | Visibility | Path | Used by |
|---|---|---|---|
| `audio-ideas` | private | `{user_id}/{uuid}.{ext}` | M2 — admin-of-own-folder only |
| `video-thumbnails` | public | `{user_id}/{video_id}.{ext}` | M4 — admin uploads, anyone reads via public URL (no listing) |

RPCs (security definer):

| Name | Purpose |
|---|---|
| `has_role(_user_id, _role)` | RLS helper |
| `create_script_with_brolls(...)` | Atomically inserts a script + its broll_suggestions for the calling admin (`auth.uid()`) |
| `calculate_video_multiplier()` (trigger function) | Recomputes `videos.multiplier` and `videos.performance_tier` whenever `videos.views_total` is set/updated, comparing against avg of last-90-days views (excluding the current row) |

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
| `scrape-video` | yes | Apify multi-plataforma. Recibe `{ video_id }`, valida ownership (RLS) y routea por `source_platform`: **instagram** (`apify/instagram-scraper`), **youtube** (`streamers/youtube-scraper`), **tiktok** (`clockworks/tiktok-scraper`). Mapea views/likes/comments/shares/caption/thumbnail/posted_at/title (YT) a `videos`, inserta snapshot en `video_metrics_history` y devuelve `{ ok, video, platform }`. |
| ~~`scrape-instagram-video`~~ | yes | **Deprecated** (reemplazada por `scrape-video`). Sigue desplegada pero ya no se llama desde el cliente. Borrarla manualmente desde el dashboard de Supabase cuando se quiera limpiar. |

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

## Out of scope until the SPEC arrives

- Schema for `/app` (tables, RLS, edge functions).
- Schema for `/recursos` (resource model, categories, search).
- Final auth UX (provider choice, onboarding, profile page).
- Pre-rendering / SSG for SEO on `/` and `/recursos/:slug` (`vite-plugin-prerender` or migrate to `vike`). Not configured yet.
- Vercel deploy + DNS cutover for `ezequiellamas.com`.
- CI (GitHub Actions for lint/build on PR).
