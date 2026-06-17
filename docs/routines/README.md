# Content-idea cloud routines — operations guide

Three Claude Code **cloud routines** (claude.ai "code triggers") generate content ideas and push
them into the app's swipe **bandeja** (`/app/admin/ideas`). They are the automated half of the
5-system idea engine (the other two — manual upload and referent feed — live entirely in-app).

| System | Routine | Reads | Cron (ART) | Idea `source` |
|---|---|---|---|---|
| S3 | **knowledge** | the `elamas-second-brain` repo + DB metrics | Mon 09:07 | `second_brain` |
| S4 | **news** | Gmail (Gemini Deep Research digests) → `ai_news` | daily 07:13 | `ai_news` |
| S5 | **winners** | `videos`/`video_posts` metrics + transcripts + comments | Fri 09:07 | `winner` |

Each routine's system prompt is in this folder: [`knowledge.md`](./knowledge.md),
[`news.md`](./news.md), [`winners.md`](./winners.md). Paste it into the routine when you create it.

## Supabase MCP — which project

Each routine's Supabase connector lists **two** projects. Always target the Personal Brand Hub:
**`zsbligbfsmdwbxcvoysu`** (pass `project_id` on every MCP call). The other one belongs to a different
app — see the repo `CLAUDE.md` ("MCP routing"). The routines use the MCP to **read** (metrics,
baselines, dedup checks) against this project.

## How a routine writes back — direct SQL via the MCP

Routines write ideas **directly into the DB with their Supabase MCP** (no token, no HTTP endpoint —
the MCP already has the rich database). Each prompt's "Write the ideas back" section has the exact
`INSERT INTO public.content_ideas (...)` (and the **news** one also `INSERT INTO public.ai_news`).
Rules the prompts enforce:

- **One multi-row INSERT per batch** → a DB trigger (`content_ideas_notify_new`) sends **one**
  push+email notification (`send-notification`, kind `ideas.new`). Routines must NOT touch the
  `notifications` table themselves.
- **`concept` required**; `pillar` ∈ `negocios|sistemas|ia_estrategica|finanzas|mentalidad`;
  `status='pending'`. S5 also sets `source_video_id` + `source_metrics`/`winner_analysis`/`comments_summary`
  (jsonb); S4 sets `news_refs` (jsonb); S3 sets `derived_from` (text[]).
- **Dedup**: the routine reads `public.content_ideas WHERE status='pending'` via the MCP first and
  skips overlaps (the fire brief also lists them). `unique(owner_id, dedup_key)` is a soft backstop.

> The old `ingest-content-idea` / `ingest-ai-news` edge functions + `INGEST_TOKEN` are **removed** —
> routines no longer need them.

## One-time setup (Ezequiel)

1. **Create 3 routines** on claude.ai, each with its `environment` bound to the GitHub repos
   `ezelamass/elamas-second-brain` + `ezelamass/ezequiellamas-landing`, and the **Supabase** MCP
   connector (the **news** one also needs the **Gmail** connector). Paste the matching system prompt.
2. **Set Supabase Edge Function secrets** (Dashboard → Project Settings → Edge Functions):
   - `ANTHROPIC_ROUTINE_URL_KNOWLEDGE` / `_NEWS` / `_WINNERS` = each routine's fire URL
     (`https://api.anthropic.com/v1/claude_code/routines/<trigger_id>/fire`).
   - `ANTHROPIC_ROUTINE_TOKEN_KNOWLEDGE` / `_NEWS` / `_WINNERS` = each routine's API token.
3. **Vault secrets** (used by the pg_cron schedule **and** the notification trigger — run once if not set):
   ```sql
   select vault.create_secret('https://zsbligbfsmdwbxcvoysu.supabase.co', 'project_url');
   select vault.create_secret('<SERVICE_ROLE_KEY>', 'scheduler_service_role_key');
   ```
   Without these the cron is a silent no-op **and** the new-ideas notification won't fire (the ideas
   still land in the bandeja; you just won't get the push/email until the secrets are set).

## Triggering

- **Scheduled** (current setup): each routine's cron lives **on claude.ai** (its `cron_expression`).
  knowledge = Mon 09:00 ART, winners = Fri 09:00 ART, news = daily 07:00 ART. The system prompts are
  self-sufficient for the scheduled path (they read `content_ideas` pending via the MCP for dedup and
  resolve the owner themselves).
- **On demand**: the "Generar ideas" button in `/app/admin/ideas` → edge fn `trigger-content-routine`
  → fires the routine (admin-gated via `has_role`). Only **knowledge** and **winners** have a button;
  **news is schedule-only** (no manual trigger).
- The `pg_cron` jobs `content-routine-*` + `dispatch_content_routine_tick()` exist as an alternative
  scheduler but are **unscheduled** while the claude.ai schedule is in use (re-schedule them only if
  you move scheduling back into the DB — otherwise routines would fire twice).

Fire is fire-and-forget: a 200 only means the routine started. Ideas appear in the bandeja a few
minutes later (the routine INSERTs them via the MCP), and Realtime refreshes the queue + the nav badge.
