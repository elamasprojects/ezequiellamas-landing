# M25 — Personal YouTube Data API integration

> Status: **in progress**. Transcript ref: §3.1 (connect own YouTube channel for
> own videos/metrics/transcripts/analysis; Apify already covers third-party YT).

## Goal
Connect the creator's **own** YouTube channel via Google OAuth (`youtube.readonly`),
sync their long-form videos + public stats, pull transcripts, and analyze them
(same concept + strategic classification as referents). Plus surface YouTube
long-form in referent analysis via a platform filter.

## What exists (reused) vs missing
- ✅ `oauth_states` + `social_accounts` tables; OAuth callback pattern in
  `Connections.tsx` (search-param handling).
- ✅ Apify YT scraping + transcript + `analyze-referent-video` (incl. M24
  classification) already work for **referents** (third-party). So "extend
  referent analysis to YT long-form" only needs a **platform filter** in the UI.
- ❌ No YouTube **Data API** usage anywhere. No own-channel sync.
- ⚠️ `social_accounts` is unique on `(owner_id, platform)` and `platform='youtube'`
  is already used by the Zernio publishing row → a Data-API token can't live there.
  **Decision:** dedicated `youtube_connections` table (clean separation).

## Required setup (user-side — flagged, can't be done from here)
A Google Cloud project with **YouTube Data API v3** enabled, an OAuth client, and
secrets in Supabase Edge Functions: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
Authorized redirect URI = `${APP_URL}/app/admin/youtube`. `APP_URL` already set.

## Implementation steps

### 1. Migration `m25_youtube_connection_and_videos`
- `youtube_connections` (one row per owner): `owner_id` unique, `channel_id`,
  `channel_title`, `channel_thumbnail_url`, `access_token`, `refresh_token`,
  `token_expires_at`, `scopes[]`, `status`, `last_synced_at`, `last_sync_error`,
  timestamps. **Admin-owner-only RLS** (no editor/advisor — it holds tokens).
- `youtube_videos`: `owner_id`, `youtube_video_id` (unique per owner), `title`,
  `description`, `published_at`, `view_count`, `like_count`, `comment_count`,
  `duration_seconds`, `thumbnail_url`, `transcript`/`transcript_status`/`_error`/
  `_language`, `concept_summary`/`concept_status`/`_error`, and the M24
  classification columns (`business_objective`, `content_objectives[]`,
  `content_type`, `main_topics[]`), `raw`, `last_synced_at`, timestamps.
  Triple-RLS (no tokens here). Regenerate types.

### 2. Edge functions
- `youtube-connect-start` `{ redirect_path? }` → builds the Google consent URL
  (`access_type=offline&prompt=consent`, scope `youtube.readonly`), stores
  `oauth_states`. Returns `{ url, state }`.
- `youtube-connect-callback` `{ code, state }` → validates state, exchanges code at
  `oauth2.googleapis.com/token`, calls `channels.list?mine=true` for channel
  identity, upserts `youtube_connections`. Returns `{ ok, channel_title }`.
- `youtube-sync` `{}` → refreshes the token if expired, reads the uploads playlist
  (`channels.list` → `contentDetails.relatedPlaylists.uploads`), pages
  `playlistItems.list`, batches `videos.list(snippet,statistics,contentDetails)`
  for stats + ISO-8601 duration, upserts `youtube_videos`. Stamps `last_synced_at`.
- `analyze-youtube-video` `{ youtube_video_row_id, force? }` → best-effort transcript
  via the public `timedtext` endpoint (fallback: status `unavailable`), then Claude
  `emit_concept` (reusing the M24 hook/format/angle/cta/summary + classification),
  caches results. Mirrors `analyze-referent-video`.

### 3. Frontend
- New `/app/admin/youtube` page + nav item: connect card (status / "Conectar canal"
  → `youtube-connect-start` redirect; handles the `?code&state` callback like
  `Connections.tsx`), "Sincronizar" button (`youtube-sync`), and a videos grid
  (stats, transcript/analysis, "Analizar" → `analyze-youtube-video`, concept +
  classification badges — reuse the badge component pattern).
- `src/lib/api/youtube.ts` + hooks `useYoutubeConnection`/`useYoutubeVideos`.
- **Referent platform filter:** add an IG/YT/TT filter to `ReferenteDetail` next to
  the date filter (satisfies the "YT long-form subsection" intent).

### 4. Verification
- Migration + RLS via SQL; types regen; `npm run build` + eslint; `deno lint`.
- Deploy the 4 functions. Full OAuth E2E requires the Google secrets above
  (flagged); the connect button will error cleanly until they're set.

## Notes
- `youtube.readonly` gives public stats (views/likes/comments). Private YouTube
  **Analytics** (impressions, watch time) would need the Analytics API + an extra
  scope — deferred.
- Own-channel transcript uses the public caption endpoint (free); if a video has no
  accessible captions it's marked `unavailable` (no paid Whisper fallback for now).
