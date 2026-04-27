# Carousel render worker

Self-hosted Node service that turns a carousel JSON into PNG (all slides) and
MP4 (slides 1/3/5 in animated mode) renders, then uploads to Supabase Storage
and pings back the `complete-carousel-render` edge function.

Runs in Docker on Railway. Idle most of the time, ~2 GB RAM during a render.

## Local dev

```bash
cd render-worker
npm install
npx playwright install chromium
cp .env.example .env  # fill in SUPABASE_*, RENDER_WORKER_SECRET
npm run dev           # tsx watch src/index.ts on :8080
```

Test the health endpoint:

```bash
curl http://localhost:8080/health
# { "ok": true, "chromium": "...", "node": "v22..." }
```

## Production deploy (Railway)

1. Create a new Railway project, connect this repo.
2. Set **Root Directory** to `.` (the repo root, NOT `render-worker/`).
3. Set **Dockerfile path** to `render-worker/Dockerfile`.
4. Add these env vars in Railway:
   - `SUPABASE_URL` = `https://zsbligbfsmdwbxcvoysu.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = (from Supabase dashboard)
   - `SUPABASE_FUNCTIONS_URL` = `https://zsbligbfsmdwbxcvoysu.functions.supabase.co`
   - `RENDER_WORKER_SECRET` = generate with `openssl rand -hex 32`
5. Deploy. Railway auto-detects the Dockerfile, builds, exposes a public URL.
6. Healthcheck: `<railway-url>/health` should return 200.
7. Add the same `RENDER_WORKER_SECRET` and the resulting `RENDER_WORKER_URL`
   as Supabase Edge Function secrets so `start-carousel-render` can reach this
   worker.

## API

### `GET /health`

Returns `{ ok: true, chromium, node }`. Used by Railway's healthcheck.

### `POST /render`

HMAC-signed. The calling edge function builds the signature with
`HMAC-SHA256(RENDER_WORKER_SECRET, "${timestamp}.${rawBody}")`.

Authorization header: `HMAC <timestamp>.<signature>` (timestamp = ms since epoch).

Body:

```json
{
  "job_id": "uuid",
  "carousel_id": "uuid",
  "owner_id": "uuid",
  "mode": "static" | "animated",
  "slides": [
    {
      "index": 0,
      "template": "T1Cover" | "T2Feature" | "T3Grid" | "T4VS" | "T5CTA",
      "content": { ... },
      "output_format": "png" | "mp4"
    }
  ]
}
```

Responds **202** immediately. Processes slides sequentially in the background.

For each slide, calls back to `POST /complete-carousel-render` with:

```json
{ "job_id", "slide_index", "status": "done", "rendered_path", "rendered_format" }
```

or, on error:

```json
{ "job_id", "slide_index", "status": "error", "error": "..." }
```

When the whole job finishes:

```json
{ "job_id", "status": "job_done" }
```

or:

```json
{ "job_id", "status": "job_error", "error": "..." }
```

## Architecture

- **`src/auth.ts`** — HMAC-SHA256 sign/verify. 5-minute timestamp skew window.
- **`src/render.ts`** — PNG via Playwright (1080×1350, deviceScaleFactor 2),
  MP4 via Hyperframes spawn. Reuses a single browser process for PNG renders.
- **`src/upload.ts`** — `carousel-renders/{owner_id}/{carousel_id}/slide_NN.{ext}`
  via service role.
- **`src/callback.ts`** — HMAC-signed POST to `complete-carousel-render`.
- **`src/queue.ts`** — Per-job orchestration. Errors per slide don't abort the
  whole job; the final `job_done`/`job_error` callback is always fired.
- **`src/index.ts`** — Express server, body validation with zod, async dispatch.

## Critical rules from system prompt v2.2

These are NON-NEGOTIABLE for the rendered output to match the design:

1. **GSAP is local, never CDN.** The Dockerfile installs it via npm; renders
   copy `node_modules/gsap/dist/gsap.min.js` into each per-slide tmp dir.
2. **`HYPERFRAMES_BROWSER_PATH` env var must point to the actual chromium.**
   The Dockerfile resolves Playwright's chromium path at build time and writes
   it to `/tmp/chromium.path`. Runtime CMD reads it back and exports.
3. **`PRODUCER_FORCE_SCREENSHOT=true`** is always set.
4. **Each MP4 must end on a hold frame** (1s of static end-state). Already
   baked into every animation timeline (see `src/lib/carousel/animations/*`).

## Cost

Railway Hobby plan = $5/mo flat, includes $5 of usage credit. Idle worker
~$5-7/mo. Active rendering bursts to ~2 GB RAM but only briefly.

To rotate the HMAC secret, update both ends:
- Railway: Service → Variables → `RENDER_WORKER_SECRET`
- Supabase: Project Settings → Edge Functions → Secrets → `RENDER_WORKER_SECRET`
