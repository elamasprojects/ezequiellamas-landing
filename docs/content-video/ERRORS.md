# Video stack — bug → cause → fix log

Every problem we hit building the Content Center showcase, with the concrete cause
and the fix. Read before debugging a HyperFrames render. Newest lessons first.

---

## 1. Metallic "clang" at the end of every sentence

**Symptom:** a metallic hit (like striking metal) at the end of each VO phrase / each
scene change.
**Cause:** the transition SFX was AI-generated with ElevenLabs `sound-generation` using
a prompt with "punchy". The model added a metallic transient. It played on every scene
transition (which land on phrase boundaries) → metal hit per sentence.
**Fix:** never AI-generate whooshes. **Synthesize a clean swish with ffmpeg** (filtered
pink-noise with a `qsin` fade-in/out envelope — no transient = no metal) and lower the
volume to ~0.38:
```bash
ffmpeg -y -f lavfi -i "anoisesrc=d=0.55:c=pink:a=0.7:r=44100" \
 -af "highpass=f=180,lowpass=f=3200,afade=t=in:st=0:d=0.16:curve=qsin,afade=t=out:st=0.22:d=0.33:curve=qsin,volume=1.1,aformat=channel_layouts=stereo" \
 -ar 44100 -ac 2 whoosh.mp3
```

## 2. Scenes "se pisan" — two scenes blended/overlaid during a transition

**Symptom:** while one scene is showing and the next starts, both are readable on top
of each other (a muddy crossfade).
**Cause:** scenes were authored as **clips with overlapping `data-start/data-duration`
on the same track**; the framework cross-faded them, so both were visible/opaque in the
overlap window.
**Fix:** drop the clip model. Use the **persistent-scene catalog model**: all scenes are
absolutely-positioned divs, scene 1 visible, scenes 2..N `opacity:0`, and ONE GSAP
timeline drives explicit transitions. Scenes never share opacity at full readability.

## 3. New scenes render fully BLACK in the MP4 (but fine in lint/inspect)

**Symptom:** S2..S6 are black in the rendered frames; S1 is fine.
**Cause:** used `immediateRender:false` on the transition `fromTo` to avoid parking
scenes off-screen. The HyperFrames renderer **seeks** the timeline per frame; with
`immediateRender:false`, a `from`/`fromTo` that the playhead jumped *past* never applied
its from-state, so the scene's `opacity` stayed at the CSS `0` → black.
**Fix:** don't use `immediateRender:false` for reveal state. Reveal opacity with a
**`tl.set(scene,{opacity:1}, T)`** at the transition time (seek-safe — applies at T and
holds), and animate position separately. Our `tH`/`tV` use `tl.set` + `tl.to`.

## 4. Incoming scene is an empty black panel during the slide

**Symptom:** transition slides in the next scene but it's empty/dark; content only
appears after it lands → looks like a black void mid-transition.
**Cause:** content used `from({opacity:0,...})` entrances timed *after* the scene
landed, so during the slide the incoming panel had no visible content.
**Fix:** on scenes that arrive via a slide, make content **ride in visible —
transform-only `from` (no `opacity:0`)**. The element starts at a small offset
(`y`/`x`/`rotationY`), visible, and settles. The panel is never empty. (The opener,
scene 1, may keep `opacity:0` because it appears on black.)

## 5. 3D card-flip "blink" (edge-on flash)

**Symptom:** a 180° Y-axis card flip shows a jarring 1-frame dark flash at the midpoint.
**Cause:** at 90° both faces are edge-on → near-zero width → a flash of background.
**Fix:** don't full-flip for scene changes. Use a **subtle 3D carousel push** instead
(rotation ≤ ~20°, scenes stay full-facing) with the SAME ease for in & out so they stay
edge-to-edge.

## 6. Transition leaves a black GAP in the middle

**Symptom:** during a slide there's a wide black band between the outgoing and incoming
scenes.
**Cause:** outgoing and incoming used **different easings** (e.g. `power3.out` vs
`power2.in`) and/or a scale-down (`0.92`) — they desynced and shrank, opening a gap.
**Fix:** **same ease for both** (`power3.inOut`) keeps them mathematically edge-to-edge
(gap = 0 at every instant); keep scale ≥ 0.985.

## 7. `<audio>` plays SILENT in the render

**Symptom:** render reports `hasAudio:true` but the MP4 has no sound from a track.
**Cause:** the `<audio>` element had no `id`. The renderer discovers media by `id`.
**Fix:** give every `<audio>` a unique `id` (`aud-music`, `aud-vo`, `aud-wh1`, ...).

## 8. Fonts fall back to a generic family

**Symptom:** lint `font_family_without_font_face`; serif/sans render wrong.
**Cause:** only `Inter`/`JetBrains Mono` auto-resolve in HyperFrames. `Instrument Serif`
and `DM Sans` aren't in the auto list.
**Fix:** add `@font-face` for them pointing at local `fonts/*.woff2` (download the Google
Fonts **latin** subset — covers Spanish accents). Also: **don't write `font-family:
var(--x)`** — the compiler's static scan won't detect the font behind a CSS variable;
use the literal family name in every rule.

## 9. `overlapping_clips_same_track` lint error

**Cause:** two scenes/audios with overlapping `data-start..data-duration` on the same
`data-track-index`.
**Fix:** alternate `data-track-index`, OR (better for scenes) use the persistent-scene
model (no scene clips at all). For SFX, space them out or keep non-overlapping on one
track.

## 10. `content_overlap` — a huge number overlaps its label

**Symptom:** inspect flags two text blocks overlapping (e.g. a 260px hero number over
its caption).
**Cause:** display font-size too large with tight `line-height` → glyph box overflows.
**Fix:** reduce font-size, set `line-height: 1`, add explicit margin between the number
and its label.

## 11. `multiple_root_compositions` lint error

**Cause:** several root HTML files in the project each had `data-composition-id` (we had
`index.html`, `v2.html`, `v3.html`).
**Fix:** exactly ONE root `index.html` with `data-composition-id`. Delete/rename extras.
Render a specific file with `render -c <file>` (but lint/inspect only read `index.html`).

## 12. inspect/lint ignore `-c`; only check `index.html`

**Cause:** `lint`/`inspect` take a project DIR and target `index.html`; only `render`
accepts `-c <file>`.
**Fix:** to validate a variant, make it `index.html` (or keep one canonical composition).

## 13. Off-screen-parked scenes flagged as overflow (info)

**Symptom:** inspect `canvas_overflow` for elements ~1900px off-canvas.
**Cause:** transition `fromTo` with default `immediateRender:true` applied the from-state
(e.g. `x:1920`) at build, parking scenes off-screen → inspect measures them off-canvas.
**Fix:** use `tl.set(...)` at the transition time instead of `fromTo` (state applies at
T, not at build). Decorative `.glow` overflow warnings are intentional — ignore or mark
`data-layout-allow-overflow`.

## 14. Real /app screenshots can't be embedded in a local render

**Symptom:** wanted real product screenshots in the video; couldn't get the files.
**Cause:** the Claude-in-Chrome bridge `save_to_disk` writes server-side, not to the
local filesystem the renderer reads. Pasting images into chat also doesn't land on disk.
**Fix:** recreate the screens as faithful animated HTML using the real data (looks
better for motion graphics anyway). To embed literal rasters, the user must drop the
PNGs into a local folder and we reference them.

---

## Quick verification discipline

`lint`+`inspect`+`render` succeeding does NOT prove it looks right. **Always extract
frames with ffmpeg and Read them** — including a few MID-transition timestamps
(`boundary-0.1`, `boundary`, `boundary+0.2`) to catch 3D jank, gaps, blinks, and
empty-incoming panels that only exist for a few frames.
