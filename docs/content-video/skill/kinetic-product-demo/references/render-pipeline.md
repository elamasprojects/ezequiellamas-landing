# Render pipeline: CLI dev loop, inspection, render, and shipping

The HyperFrames CLI is pinned to **`hyperframes@0.6.99`**. The composition project lives **outside**
the consuming app repo; only the final MP4 + poster get copied in.

## Project layout

```
…/var-cursor-flow/            # a composition project (sibling of the app repo, NOT inside it)
├── index.html                # the ONE root composition (data-composition-id="main")
├── fonts/                    # local woff2 (@font-face src targets)
├── vo.mp3  music.mp3         # voiceover + bed
├── whoosh.mp3  click.mp3     # ffmpeg-synthesized SFX
└── renders/                  # render output (build artifact)
```

Only `index.html` + `fonts/` + the audio (+ `package.json`/configs) are *sources*. `frames/` and
`renders/` are build artifacts — exclude them when copying the project anywhere.

## The dev loop

Run all of these **from the composition folder**.

```bash
# 0. scaffold a fresh project (once):
npx hyperframes@0.6.99 init <name> --non-interactive --skip-skills --resolution landscape --example blank

# 1. lint — must be 0 errors. Catches multiple roots, font-without-face, overlapping clips.
npx hyperframes@0.6.99 lint

# 2. inspect — probe specific timestamps for layout problems (overlap, off-canvas).
#    Use one probe per scene region AND a few mid-transition times to catch 3D jank.
npx hyperframes@0.6.99 inspect --at 2,5,8,11,14,17

# 3. render — to an mp4 inside renders/
npx hyperframes@0.6.99 render --output renders/<name>.mp4
#    (render a non-default file with:  render -c <file> )
```

`lint`/`inspect` only read `index.html`; only `render` accepts `-c <file>` (Bug 11/12). So to
validate a variant it must *be* the `index.html`.

## Verify by reading frames — do not trust green CLI

A clean `lint`/`inspect`/`render` does **not** prove it looks right. Extract frames with ffmpeg and
actually look at them, including mid-transition boundaries where 3D gaps/blinks/empty-panels hide:

```bash
mkdir -p frames    # must exist first, or ffmpeg errors "Could not open file"
# probe scene bodies + transition boundaries (boundary, boundary-0.1, boundary+0.2):
for t in 0.9 3.2 3.4 4.05 6.4 9.4 10.5 12.8 14.1 17.6 19.1; do
  ffmpeg -y -ss $t -i renders/<name>.mp4 -frames:v 1 -q:v 2 frames/x_$t.png -loglevel error
done
# then Read each frames/x_*.png and check: no overlap, no black incoming panel, captions correct.
```

If you find a problem, fix the source `index.html`, re-`inspect`, re-`render`, re-extract — loop
until the frames are clean.

## Poster + ship into the app

Extract a strong representative frame as the poster, then copy the MP4 + PNG into the app's public
demo folder (Vercel/static servers serve `public/` before any SPA rewrite, so they're reachable at
`/demo/<name>.mp4`).

```bash
# poster from a signature moment (full res, straight from the mp4):
ffmpeg -y -ss 14.1 -i renders/<name>.mp4 -frames:v 1 -q:v 2 <app>/public/demo/cc-<name>.png -loglevel error
cp renders/<name>.mp4 <app>/public/demo/cc-<name>.mp4
```

Naming used by the reference app: `cc-kinetic.*`, `cc-cursor.*`, `cc-captions.*` in `public/demo/`,
surfaced by a small gallery page. The gallery autoplays only the featured reel **muted** (autoplay
policy) and shows a "🔊 activá el sonido" note; the others play on demand. See `audio-voice-sfx.md`.

## Inspect quirks that are NOT bugs

- A deliberately oversized decorative element (e.g. the captions watermark at 520px, or a `.glow`)
  will emit `text_box_overflow` / `canvas_overflow`. That's expected for bleed-off decoration — mark
  it `data-layout-allow-overflow` or just ignore those specific notes (Bug 13).
- `inspect` measuring a scene "off-canvas" usually means a `fromTo` parked it off-screen at build —
  switch that reveal to `tl.set(...)` (Bug 13) and it disappears.
