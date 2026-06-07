# M24 — Strategic referent analysis (date filter, classification, reports)

> Status: **in progress**. Transcript refs: §2.5 (date filter), §2.6 (per-video
> strategic classification), §2.7 (content evolution), §2.8 (incremental Markdown
> report saved with date), §2.9 (business inference).

## Goal
Go beyond per-video concept summaries: classify every referent video by strategic
intent, then synthesize a per-referent **Markdown report** (content strategy,
topic mix, evolution over time, and the referent's likely business/sales model).
Re-running is **incremental** — only videos newer than the last report are processed.

## What exists (reused)
- `analyze-referent-video`: transcript (YT SRT / IG-TT Whisper) + Claude `emit_concept`
  (hook/format/angle/cta/summary) → writes `referent_videos.concept_*`.
- `bulk-analyze-referents`: fire-and-forget dispatch of `analyze-referent-video`
  over a referent's pending videos.
- `ReferenteDetail.tsx` + `ReferentVideoCard.tsx`: video grid + per-card "Analizar".
- **Missing:** per-video strategic tags, the report generator, report storage, a
  Markdown viewer, the date filter.

## Implementation steps

### 1. Migration `m24_referent_strategy_and_reports`
- Add to `referent_videos` (populated by `analyze-referent-video`, gated by the
  existing `concept_status`):
  - `business_objective text` (`viralidad|nutricion|conversion`)
  - `content_objectives text[]` (subset of `educar|entretener|inspirar`)
  - `content_type text` (`educacional|lifestyle|rutina|otros`)
  - `main_topics text[]`
- New `referent_reports` table: `id`, `referent_id` (FK cascade), `owner_id`,
  `created_at`, `updated_at`, `period_label text`, `markdown text`,
  `covered_from timestamptz`, `covered_through timestamptz` (max `posted_at`
  covered → drives incremental), `video_count int`, `status text`, `error text`.
  Triple-RLS mirroring `referents`.
- Regenerate `src/lib/database.types.ts`.

### 2. `analyze-referent-video` — per-video classification (§2.6)
- Extend the `emit_concept` tool with `business_objective`, `content_objectives[]`,
  `content_type`, `main_topics[]` (+ enum guidance in `CONCEPT_SYSTEM`).
- Write the 4 new columns in `setStatus`. No status changes (these ride along with
  `concept_status='done'`). Re-analyze with `force` to backfill old rows.

### 3. New edge function `analyze-referent-strategy` (§2.7–2.9)
- Input `{ referent_id, force? }`. Determine `since` = max `covered_through` of this
  referent's `done` reports (null/force → all videos).
- Select the referent's `concept_status='done'` videos with `posted_at > since`
  (ascending). If none, return a "nothing new / analyze videos first" result.
- Claude Sonnet 4.6 with a tool `emit_strategy_report` returning `report_markdown`,
  system-prompted to cover: strategy overview, business-objective mix, content
  objectives/types, main topics, **evolution over time** (§2.7), and **business
  inference** (§2.9 — product, what/how they sell, content-as-sales-tool). Input =
  per-video `{posted_at, platform, views, title, business_objective,
  content_objectives, content_type, main_topics, concept_summary}` (concept summaries,
  not full transcripts, to bound tokens).
- Insert a `referent_reports` row (`status='done'`, markdown, `covered_from/through`,
  `video_count`, `period_label` = month/year of run).

### 4. Frontend
- **Date filter (§2.5):** native `<input type="date">` from/to in `ReferenteDetail`,
  filtering the grid by `posted_at` (client-side over the loaded videos).
- **Classification badges:** show `business_objective` / `content_type` /
  `content_objectives` / `main_topics` on `ReferentVideoCard`.
- **"Analizar todos"** button → `bulk-analyze-referents` (ensures coverage).
- **Reports section** in `ReferenteDetail`: "Generar informe" button →
  `analyze-referent-strategy`; list of `referent_reports` (period + video_count).
- **Report viewer:** route `/app/admin/referentes/:id/reportes/:reportId` rendering
  the Markdown (add `react-markdown` + `remark-gfm`, lazy-loaded; reuse the print
  affordance pattern). 
- API `src/lib/api/referentReports.ts` (+ extend `referents.ts` with
  `createReferentStrategyReport`, `bulkAnalyzeReferent`), hooks
  `useReferentReports`/`useReferentReport`.

### 5. Verification
- Migration + RLS via SQL; types regen; `npm run build` + eslint; `deno lint`.
- E2E: analyze a referent's videos (confirm new tags populate), generate a report
  (confirm a `referent_reports` row + Markdown renders), add a newer video, re-run
  → confirm only the new video is covered (`covered_from` = previous `covered_through`).
- Deploy `analyze-referent-video` + `analyze-referent-strategy`.

## Notes
- Reuses the same Claude/Whisper/Apify patterns; the only new dependency is
  `react-markdown` (admin-only report viewer, lazy-loaded).
- Incremental = report rows are windowed snapshots; the detail page shows the
  timeline of reports.
