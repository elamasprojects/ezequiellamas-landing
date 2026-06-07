# M26 — YouTube long-form production system

> Status: **in progress**. Transcript ref: Part 1 (§1.3–1.9). Largest milestone.
> Depends on external keys you have (HeyGen, ElevenLabs) + existing infra
> (Gemini covers, Bunny, Railway renderer, scheduler).

## Goal
The only manual recording is long-form YouTube. From an idea (text/audio) + a
length, the AI generates the **structure** (intro → chapters → CTA, points +
approx timing), the creator edits sections and per-section picks **record myself
vs AI clone**, generates clone segments (HeyGen avatar + ElevenLabs voice), gets
**5 titles + 3 thumbnails**, and the project moves into Ideas (long vs short).

## Staging
- **Phase A (built now):** data model, editable `youtube.structure` prompt,
  `generate-youtube-structure` (idea→structure+titles+sections, with the M22
  creator profile), the Studio UI (create + section editor + title picker),
  thumbnails via the existing Gemini covers flow.
- **Phase B (built now, needs keys to run):** clone pipeline — ElevenLabs voice +
  HeyGen avatar + webhook → store clone segment. Flagged: `HEYGEN_API_KEY`,
  `ELEVENLABS_API_KEY`, `HEYGEN_AVATAR_ID`, `ELEVENLABS_VOICE_ID`,
  `HEYGEN_WEBHOOK_SECRET` must be set.
- **Phase C (scoped follow-ups, not built now):** presentation slides as video
  background (needs `render-worker` Railway changes + deploy); publishing
  "optimal slot" suggestion (§1.8); long→short clipping (manual link — no clip
  API). Each is described below for a later pass.

## What's reused (from explore)
- **Gemini covers** (`generate-cover`, bucket `cover-renders`, 3-layer prompt) →
  3 thumbnail options (16:9 cover rows linked to the project).
- **Bunny** (`bunny-create-video`, CDN) → optional home for clone output.
- **Railway renderer** (`start-carousel-render` + `complete-carousel-render`
  HMAC webhook) → the pattern for slides (Phase C).
- **Scheduler/publishing** → optimal-slot button (Phase C).
- **`AudioRecorder.tsx`** → idea audio + per-section recorded audio.
- **`zernio-webhook`** HMAC pattern → `heygen-webhook`.
- **M22 prompt-override system** → `youtube.structure` slug (flip `comingSoon`).

## Implementation — Phase A + B

### 1. Migration `m26_youtube_projects`
- `youtube_projects`: `owner_id`, `title`, `idea`, `length_tier`
  (`short|medium|long`), `status` (`structuring|structured|recording|ready|failed`),
  `title_options text[]`, `chosen_title`, `audio_upload_id`, `structure_status`,
  `structure_error`, `default_audio_mode` (`avatar|record|elevenlabs`),
  `chosen_thumbnail_cover_id`, timestamps. Triple-RLS.
- `youtube_project_sections`: `project_id` (FK cascade), `owner_id`, `position`,
  `kind` (`intro|chapter|cta`), `title`, `points` (the per-section guide/script),
  `duration_seconds`, `recorder` (`creator|clone`), `audio_mode`
  (`avatar|record|elevenlabs`), `recorded_audio_path`, `clone_status`
  (`idle|pending|generating|done|failed`), `clone_error`, `heygen_video_id`,
  `clone_video_url`, `bunny_video_id`, timestamps. Triple-RLS.
- `covers`: add nullable `youtube_project_id` FK (thumbnail linkage).
- Regenerate types.

### 2. `youtube.structure` editable prompt
- New default in `generate-youtube-structure/youtube-structure-prompt.ts`
  (framework: intro = por qué ver + qué obtenés + resumen; desarrollo = capítulos
  con temas + cómo presentarlos; cierre/CTA; tiempos aprox; NOT a word-for-word
  script). `get-prompt-defaults` serves it; flip `comingSoon` off in
  `promptOverrides.ts`.

### 3. Edge `generate-youtube-structure`
- `{ youtube_project_id?, idea?, audio_upload_id?, length_tier }` → transcribe
  audio if given, load `prompt_overrides['youtube.structure'] ?? default` +
  inject the M22 creator profile, Claude tool `emit_youtube_structure`
  → `{ titles: string[5], sections: [{kind,title,points,duration_seconds}] }`.
  Upsert project + replace sections.

### 4. Clone pipeline (Phase B)
- `generate-clone-voice` `{ section_id }` → ElevenLabs TTS of `points` →
  upload to a `youtube-clone-audio` bucket → return audio URL (for `audio_mode='elevenlabs'`).
- `start-heygen-render` `{ section_id }` → builds a HeyGen v2 video request using
  `HEYGEN_AVATAR_ID` + (avatar voice | uploaded recorded audio | ElevenLabs audio
  per `audio_mode`), POST, store `heygen_video_id`, `clone_status='generating'`.
- `heygen-webhook` (verify_jwt=false, HMAC) → on completion store `clone_video_url`
  (+ optional Bunny fetch), `clone_status='done'`; on failure store error.

### 5. Frontend — `/app/admin/studio`
- Nav "YouTube Studio". List of `youtube_projects` (long-form ideas).
- New project: `AudioRecorder`/text + length selector → `generate-youtube-structure`.
- Project editor: ordered **section cards** (editable `points` textarea + duration +
  `recorder` creator/clone toggle + `audio_mode` select + per-section "Generar clon"
  → voice→heygen, status/preview); **title picker** (1 of 5); **"Generar 3
  miniaturas"** (creates 3 covers via the existing Gemini flow, pick one) ;
  default-audio-mode control.
- API `src/lib/api/youtubeStudio.ts` + hooks.

### 6. Verification
- Migration + RLS via SQL; types regen; `npm run build` + eslint; `deno lint`.
- Deploy `generate-youtube-structure`, `generate-clone-voice`, `start-heygen-render`,
  `heygen-webhook`, and redeploy `get-prompt-defaults` (new youtube default).
- Structure generation is fully testable now; the clone steps return clean
  "key not configured" errors until HeyGen/ElevenLabs secrets + avatar/voice IDs
  are set, then work E2E. HeyGen webhook URL =
  `https://zsbligbfsmdwbxcvoysu.functions.supabase.co/heygen-webhook`.

## Phase C — scoped follow-ups
- **Slides (§1.9):** add slide templates to `render-worker`, a
  `start-youtube-slides-render` dispatch + reuse `complete-carousel-render`-style
  callback → PNGs in a bucket, downloadable as recording backgrounds. Needs a
  Railway deploy.
- **Optimal slot (§1.8):** `suggestOptimalSlots()` helper (config-driven weekly
  best-times per platform + timezone) + a "Próximo slot óptimo" button in
  `NewScheduledPost`.
- **Long→short (§1.5):** no clip API (Submagic/Opus have no programmatic access
  here) → a field to paste the published YouTube URL + manual clip links; the
  short outputs become normal scripts/scheduled posts.
