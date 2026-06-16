---
name: kinetic-product-demo
description: >-
  Author high-energy "dopamine" product-demo / presentation / showcase videos as
  HyperFrames HTML compositions (HTML + GSAP rendered to MP4) — the kind where nothing
  sits static for more than a beat. Use this skill whenever the user wants to create or
  iterate on a kinetic motion-graphics product video, a SaaS/app showcase reel, an
  animated feature walkthrough, a "presentation video", "otra versión del video", or one of
  the reusable TEMPLATES this skill ships. There is a small, growing template library —
  two templates today: (A) CURSOR-FLOW, where an animated cursor clicks real-looking app
  buttons with click SFX, button press-reactions and transitions, walking the product flow;
  and (B) ONE-WORD CAPTIONS, word-by-word karaoke subtitles (one word per frame, swapping
  nearly instantly, very visual) plus full multi-word caption lines, synced to a voiceover
  with highlighted keywords and animated handwritten cursive. Covers the seek-safe
  HyperFrames authoring model, ElevenLabs voiceover with word timings, ffmpeg-synthesized
  SFX, fonts, and the render/deploy loop. Trigger even if the user just says "make another
  version of the video", "a new video template", "add captions to the reel", "one word at a
  time captions", "karaoke subtitles", "a cursor clicking through the app", "más dinamismo /
  más dopamina", or names HyperFrames/GSAP motion graphics.
---

# Kinetic product-demo videos (HyperFrames)

This skill captures a proven, repeatable process for producing short (15–25s),
high-energy product-showcase videos as **HyperFrames** compositions: a single HTML
file driven by one **GSAP** timeline, rendered to MP4 by headless Chrome. It was
distilled from building a real SaaS showcase reel in several forms — a **kinetic** base
plus two reusable templates, **cursor-flow** and **one-word-captions** — and it encodes both
the *creative direction* (what makes them feel good) and the *exact technical stack*
(how to make them render correctly and deterministically).

The output is always: `index.html` (+ local `fonts/`, `vo.mp3`, `music.mp3`, SFX
`*.mp3`) → an MP4 + a poster PNG.

## The stack (exact)

| Layer | Tool | Notes |
|---|---|---|
| Composition | **HyperFrames** `npx hyperframes@0.6.99` | HTML + GSAP → MP4 via headless Chrome. CLI: `lint`, `inspect`, `preview`, `render`. |
| Animation | **GSAP 3** (one `gsap.timeline()`) | Everything hangs off ONE timeline registered on `window.__timelines["main"]`. |
| Voiceover | **ElevenLabs** REST (`/with-timestamps`) | Returns per-character timings → derive per-word timings for caption sync. |
| SFX | **ffmpeg** synthesis (NOT AI) | Whoosh = filtered pink-noise envelope; click = broadband impulse. AI SFX sound metallic — do not use them. |
| Music | a low bed mp3 | Ducked under the VO. |
| Render | `npx hyperframes render` | 1920×1080, then extract a poster frame with ffmpeg. |

> The composition project lives **outside** the consuming app repo (e.g. a sibling
> `…/var-cursor-flow/` folder). Only the final `*.mp4` + poster `*.png` get copied
> into the app (`public/demo/…`). See `references/render-pipeline.md`.

## Why HyperFrames is "seek-safe" (read this first)

The renderer does **not** play the timeline — it calls `tl.seek(t)` for every frame
and screenshots. So the composition must be a pure function of `t`: the same `t`
must always produce the same pixels. This single fact drives almost every rule in
this skill. Anything that depends on wall-clock time, randomness, real playback, or
infinite loops will desync or flicker. The full rule set + the hard-won bug→fix log
is in **`references/seek-safe-model.md`** — read it before writing any GSAP.

## Creative guidelines (the "dopamine" rules)

These are the directives that shaped the videos, converted into rules. They are the
north star — when a variant feels flat, it is almost always violating one of these.

1. **Nothing static for more than ~0.5–1s.** There must *always* be something in
   motion on screen — a drifting background, a breathing glow, a progress bar
   advancing, a number counting. A still hero shot held for >1s reads as "broken".
2. **Max energy, max effects.** Lean into transitions, SFX on every scene change,
   count-ups, draw-ons, scale/depth pops. Go to the limit; restraint is not the goal here.
3. **Short scenes, fast cuts.** Each beat is brief. Prefer more scenes that each do
   one thing over a few scenes that linger.
4. **Big elements, few tiny things.** Favor large headlines, large logos, large
   numbers, and moving "screenshots" of the product over dense small text/figures.
   (This is the explicit brief for the cursor-flow variant.)
5. **Real, recognizable brand assets.** Use the actual platform logos (Instagram,
   YouTube, TikTok) as inline SVG in brand colors — never generic icons.
6. **Every element enters with motion.** No element should pop in statically; it
   slides/scales/fades in. Incoming scene content rides in already-visible
   (transform-only) so a panel never flashes empty/black (see pitfalls).
7. **SaaS social motion-graphics feel**, not "PowerPoint 3D". 3D is good but subtle —
   small rotations, clean eases. Buggy/over-rotated 3D looks amateur.
8. **Sound is part of the design.** Argentine-Spanish voiceover (cloned voice when
   available), a music bed, and synthesized SFX (whoosh on transitions, click on
   cursor presses). The first video on a page autoplays muted; the rest play on demand.
9. **Plan before building.** For a multi-variant job, first write a plan MD with three
   parts — (1) shared guidelines, (2) variant A plan, (3) variant B plan — including
   the VO script and the word-level sync table. Then build, revisiting the plan.

## Production pipeline (overview)

1. **Plan** — write the plan MD (guidelines + per-variant plan + VO script + sync table).
2. **Voiceover** — generate VO via ElevenLabs `/with-timestamps`; save `vo.mp3` and the
   word-timing table. See `references/audio-voice-sfx.md`.
3. **SFX + music** — synthesize whoosh/click with ffmpeg; add a music bed.
4. **Fonts** — drop the needed woff2 into `fonts/` and wire `@font-face` with literal
   family names. See `references/fonts.md`.
5. **Compose** — author `index.html`: persistent-scene model, one GSAP timeline, the
   template-specific rig (cursor-flow or one-word captions). See the template references.
6. **Validate** — `npx hyperframes lint` then `inspect --at t1,t2,…`; fix overlaps /
   black frames / desync. Read the frames.
7. **Render + ship** — `render --output renders/x.mp4`, extract a poster, copy the MP4 +
   PNG into the app. See `references/render-pipeline.md`.

## Templates (a growing library)

This skill ships a small library of reusable video **templates**, all built on the shared
seek-safe base (persistent scenes + 3D carousel transitions + the audio rig). **Two
templates exist today; the library is designed to grow** — add a new one as its own
`references/<template>.md` following the same pattern, and list it here. Pick the template
that matches the brief.

| Template | What it is | Reference |
|---|---|---|
| **Cursor-flow** | Big elements + app screens in motion. A global animated cursor + ripple, device mocks (browser/phone), big logos/numbers, and a `clickFX()` helper that syncs a press-scale + ripple + button glow + click SFX at exact timestamps — **each click triggers the next scene/action**. "elementos grandes y pantallas de la app en movimiento; un cursor hace clic en botones reales, con sonido de clic, reacción del botón y transición." | `references/cursor-flow.md` |
| **One-word captions** | Subtitles synced to the VO. Primarily a `kara()` **karaoke** mode — **one word per frame**, swapping almost instantly (very visual) — plus a `full()` mode (4–5 words at once with the spoken keyword highlighted) for some lines. Combines a geometric sans with an animated handwritten cursive, over an always-moving backdrop + progress bar. | `references/one-word-captions.md` |

*The original **kinetic** reel (fast scenes, count-ups, draw-on charts) is the shared base
these templates extend, not a separate template — its rig lives in `references/seek-safe-model.md`.*

**More templates are coming** (e.g. split-screen comparisons, data-dashboard fly-throughs,
testimonial/quote reels). When you add one, keep it a self-contained `references/*.md` so the
library stays composable.

## Fonts: brand vs. stylistic (important)

Keep these straight — they are NOT the same thing:

- **Brand fonts** (the example brand here): **Instrument Serif**, **DM Sans**,
  **JetBrains Mono**. These are the identity; use them for the kinetic/cursor variants’
  headlines, body, and mono labels.
- **Stylistic caption fonts**: **Poppins** (geometric sans) + **Caveat** (handwritten
  cursive) were used **only** for the one-word captions template as a deliberate styling choice —
  they are **not** the brand typeface. Do not present "Poppins + Caveat" as the brand, and
  do not pull them into the brand surfaces. When reusing this skill for a different brand,
  swap the brand fonts for that brand’s identity and treat the caption fonts as a
  detachable stylistic layer. Details + woff2 sourcing in `references/fonts.md`.

## Reference files

| File | When to read |
|---|---|
| `references/seek-safe-model.md` | **Always, first.** Determinism rules, persistent-scene model, 3D transition recipe, and the full bug→fix log. |
| `references/cursor-flow.md` | Building/iterating the **cursor-flow** template. Cursor rig, `clickFX()`, device mocks, click-sync timings. |
| `references/one-word-captions.md` | Building/iterating the **one-word captions** template. `kara()`/`full()`, Caveat handwriting, highlight, backdrop. |
| `references/audio-voice-sfx.md` | Generating the VO (ElevenLabs word timings), the ffmpeg SFX recipe, music bed, audio wiring. |
| `references/fonts.md` | Wiring fonts; brand vs stylistic; the `@font-face` literal-name gotcha. |
| `references/render-pipeline.md` | The CLI dev loop, frame inspection, render, poster extraction, and copy-into-app convention. |

## Quickstart checklist

- [ ] Plan MD written (guidelines + variant plans + VO script + word-sync table).
- [ ] `vo.mp3` generated + word-timing table saved.
- [ ] `whoosh.mp3` / `click.mp3` synthesized; `music.mp3` bed added.
- [ ] `fonts/` populated; `@font-face` uses literal family names, `font-display:block`.
- [ ] One GSAP timeline; registered on `window.__timelines["main"]` LAST.
- [ ] No forbidden non-deterministic sources; no infinite repeats; `tl.set` for reveals.
- [ ] `lint` clean; `inspect` frames checked (no overlap / black / desync).
- [ ] Rendered MP4 + poster extracted and copied into the app.
