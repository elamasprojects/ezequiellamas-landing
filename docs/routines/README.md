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

## How a routine writes back (the contract)

Routines do **not** run SQL against the DB (the default Supabase MCP points at the wrong project —
that would silently write to another database). Instead they `POST` each idea to a thin service-role
edge function that owns ownership-stamping, dedup, and the notification:

```
POST https://zsbligbfsmdwbxcvoysu.functions.supabase.co/functions/v1/ingest-content-idea
Header: x-ingest-token: <INGEST_TOKEN>
Body:
{
  "owner_id": "<optional — defaults to the sole admin>",
  "ideas": [
    {
      "source": "second_brain" | "ai_news" | "winner",
      "concept": "the idea, 1-3 sentences",        // required
      "hook": "optional opening line",
      "angle": "optional framing",
      "rationale": "why this idea / why now",
      "pillar": "negocios | sistemas | ia_estrategica | finanzas | mentalidad",
      "suggested_format_id": "<uuid from public.formats, optional>",
      "derived_from": ["second-brain/note-slug", ...],   // S3: vault provenance
      "source_video_id": "<videos.id>",                   // S5 only
      "source_metrics": { "views_total": 0, "multiplier": 0, "performance_tier": "", "platform": "", "source_url": "", "likes": 0, "comments": 0 }, // S5
      "winner_analysis": { "summary": "...", "factors": ["..."] },   // S5
      "comments_summary": { "summary": "..." }                       // S5
    }
  ]
}
```

- `concept` is required; everything else is optional. Send the whole week's batch in one call —
  the function sends **one** push + email notification per call.
- **Dedup is automatic**: the function computes a `dedup_key` from `source + normalized concept` and
  upserts on `(owner_id, dedup_key)` do-nothing. The trigger brief also lists the currently-pending
  ideas under "do NOT duplicate these" — honor it to avoid near-duplicates the hash won't catch.

The **news** routine first records raw items (idempotent on the Gmail message id), then turns the
relevant ones into ideas:

```
POST .../functions/v1/ingest-ai-news    (header x-ingest-token)
Body: { "items": [ { "external_id": "<gmail msg id>", "headline": "...", "summary": "...", "url": "...", "published_at": "...", "relevance_score": 0.0 } ] }
```

## One-time setup (Ezequiel)

1. **Create 3 routines** on claude.ai, each with its `environment` bound to the GitHub repos
   `ezelamass/elamas-second-brain` + `ezelamass/ezequiellamas-landing`, and the **Supabase** MCP
   connector (the **news** one also needs the **Gmail** connector). Paste the matching system prompt.
2. **Give each routine the `INGEST_TOKEN`** (so it can call the ingest endpoints) — store it however
   the routine lets you keep a secret/env, or inline it in the routine's own config. Generate it:
   `openssl rand -hex 32`.
3. **Set Supabase Edge Function secrets** (Dashboard → Project Settings → Edge Functions):
   - `INGEST_TOKEN` = the value from step 2.
   - `ANTHROPIC_ROUTINE_URL_KNOWLEDGE` / `_NEWS` / `_WINNERS` = each routine's fire URL
     (`https://api.anthropic.com/v1/claude_code/routines/<trigger_id>/fire`).
   - `ANTHROPIC_ROUTINE_TOKEN_KNOWLEDGE` / `_NEWS` / `_WINNERS` = each routine's API token.
4. **Vault secrets** (for the pg_cron schedule — run once via SQL if not already set):
   ```sql
   select vault.create_secret('https://zsbligbfsmdwbxcvoysu.supabase.co', 'project_url');
   select vault.create_secret('<SERVICE_ROLE_KEY>', 'scheduler_service_role_key');
   ```
   Without these the cron is a silent no-op (the on-demand button still works once step 3 is done).

## Triggering

- **On demand**: the "Generar ideas" button in `/app/admin/ideas` → edge fn `trigger-content-routine`
  → fires the routine. (Admin-gated via `has_role`.)
- **Scheduled**: `pg_cron` jobs `content-routine-knowledge` / `-winners` / `-news` →
  `dispatch_content_routine_tick(<system>)` → same `trigger-content-routine`. Same code path as the button.

Fire is fire-and-forget: a 200 only means the routine started. Ideas appear in the bandeja a few
minutes later (via `ingest-content-idea`), and Realtime refreshes the queue + the nav badge.
