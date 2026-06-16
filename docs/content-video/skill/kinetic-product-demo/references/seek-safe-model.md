# Seek-safe model + persistent scenes + the bug→fix log

**Read this before writing any GSAP.** The HyperFrames renderer does not *play* the
timeline — it calls `tl.seek(t)` for each frame and screenshots. So the composition must
be a **pure function of `t`**: the same `t` must always resolve to the same pixels, with no
hidden playback state. Every rule below exists because some non-pure construct desynced or
flickered during a real render.

## The non-negotiable rules

1. **Deterministic only.** No randomness, no wall-clock/current-time, no `performance`
   timing, no `repeat:-1`. Anything whose value depends on something other than `t` will
   differ between the preview and the seeked render.
2. **One paused master timeline.** Create `const tl = gsap.timeline({ paused: true })`, append
   everything to it, and register it on `window.__timelines["main"]` **last**. The composition
   root carries `data-composition-id="main"`.
3. **One root, one composition.** Exactly one `index.html` with `data-composition-id` and
   `data-duration` = total seconds. `lint`/`inspect` only read `index.html`; render a non-default
   file with `render -c <file>`.
4. **Reveal opacity with `tl.set`, never `fromTo`/`immediateRender:false`.** A `from`/`fromTo`
   the playhead jumped *past* never applies its from-state under seeking, leaving the element at
   its CSS opacity (often `0`) → black. Use `tl.set(el, { opacity: 1 }, T)` (applies at `T` and
   holds) and animate position with a separate `tl.to`.
5. **Captions / swaps are `tl.set` keyframes, not animated state.** Pre-render all spans, then
   `tl.set(opacity)` to toggle them. Scrubbing to any frame resolves the correct single visible
   element with no animation to "miss".
6. **Fonts: literal family names + local `@font-face`.** Never `font-family: var(--x)` (the
   compiler's static scan won't see it). See `fonts.md`.

## Persistent-scene model (NOT clips)

This is the only scene model that does not bleed two scenes together.

- All scenes are **absolutely-positioned divs** stacked by ascending `z-index`.
- **Scene 1 is visible; scenes 2..N have CSS `opacity:0`.**
- **ONE GSAP timeline** drives explicit transitions. Scenes never share opacity at full
  readability.
- Do **not** author scenes as clips with overlapping `data-start/data-duration` on one track —
  the framework cross-fades them and both render opaque in the overlap (this is Bug 2).

```css
#root { perspective: 1900px; }              /* 1600–1900px; enables the 3D transitions */
.scene {
  position: absolute; inset: 0; background: #0a0a0a; overflow: hidden;
  will-change: transform, opacity; backface-visibility: hidden;
}
#s1 { z-index: 1 } #s2 { z-index: 2; opacity: 0 } #s3 { z-index: 3; opacity: 0 }
#s4 { z-index: 4; opacity: 0 } #s5 { z-index: 5; opacity: 0 } #s6 { z-index: 6; opacity: 0 }
```

```html
<div id="root" data-composition-id="main" data-start="0" data-duration="19.7"
     data-width="1920" data-height="1080">
```

```js
window.__timelines = window.__timelines || {};
const tl = gsap.timeline({ paused: true });
// … append all scene animations + transitions …
window.__timelines["main"] = tl;   // register LAST
```

## 3D carousel transition (the only scene-change that doesn't blink or gap)

`tH` = horizontal push (slide on X with a small `rotationY`); `tV` = vertical (Y + `rotationX`).
**Same ease for in & out** keeps the two scenes mathematically edge-to-edge — gap = 0 at every
instant. Reveal/hide opacity with `tl.set` (never `fromTo`). Keep rotation ≤ ~20° and scale
≥ 0.985 — bigger rotations flash edge-on, smaller scales open a gap.

```js
const D = 0.5;
function tH(o, n, t, dur, dir) { // dir +1: incoming from right; -1: from left
  tl.set(n, { x: 1920 * dir, y: 0, rotationX: 0, rotationY: -18 * dir, scale: 0.985, opacity: 1, transformOrigin: "50% 50%" }, t);
  tl.to(n, { x: 0, rotationY: 0, scale: 1, duration: dur, ease: "power3.inOut" }, t);
  tl.to(o, { x: -1920 * dir, rotationY: 18 * dir, scale: 0.985, duration: dur, ease: "power3.inOut" }, t);
  tl.set(o, { opacity: 0, x: 0, rotationY: 0, scale: 1 }, t + dur + 0.05); // hide AFTER the slide
}
function tV(o, n, t, dur, dir) {
  tl.set(n, { y: 1080 * dir, x: 0, rotationY: 0, rotationX: 16 * dir, scale: 0.985, opacity: 1, transformOrigin: "50% 50%" }, t);
  tl.to(n, { y: 0, rotationX: 0, scale: 1, duration: dur, ease: "power3.inOut" }, t);
  tl.to(o, { y: -1080 * dir, rotationX: -16 * dir, scale: 0.985, duration: dur, ease: "power3.inOut" }, t);
  tl.set(o, { opacity: 0, y: 0, rotationX: 0, scale: 1 }, t + dur + 0.05);
}
// alternate H/V and direction so the motion never repeats the same way twice:
tH("#s1", "#s2", 3.31, D, 1);
tV("#s2", "#s3", 6.27, D, 1);
tH("#s3", "#s4", 9.31, D, -1);
tV("#s4", "#s5", 12.68, D, -1);
tH("#s5", "#s6", 15.52, D, 1);
```

## Transform-only entrances (so a sliding scene never flashes empty/black)

Scenes that arrive via a slide must have their content **ride in already-visible** — animate
`y`/`x`/`scale`/`rotation` only, **no `opacity:0`**. If you fade content in *after* the scene
lands, the incoming panel is an empty black void during the slide (Bug 4).

```js
const P3 = "power3.out", P4 = "power4.out", EXPO = "expo.out", BACK = "back.out(2)";
tl.from("#s3-title", { y: 50, duration: 0.6, ease: EXPO }, 6.55);          // transform only
tl.from("#s3-dev",   { x: 80, scale: 0.95, duration: 0.6, ease: P3 }, 6.6); // transform only
tl.from("#s4-ig",    { scale: 0, rotation: -30, duration: 0.5, ease: BACK }, 10.2);
```

The **opener (scene 1) is the only scene that may use `opacity:0`** — it appears on black, so
there is no panel behind it to reveal. Data animations (count-ups, bar/chart/meter fills) play
just *after* a scene lands, not during its slide.

## The bug→fix log (14 entries — read before debugging)

Every one of these cost real render cycles. If you see the symptom, jump straight to the fix.

1. **Metallic "clang" at every sentence end.** Cause: the whoosh SFX was AI-generated
   (ElevenLabs `sound-generation`) → metallic transient on every transition. **Fix:** never
   AI-generate whooshes; synthesize with ffmpeg (filtered pink-noise + `qsin` envelope). See
   `audio-voice-sfx.md`.
2. **Two scenes blended during a transition (muddy crossfade).** Cause: clips with overlapping
   `data-start/data-duration` on one track. **Fix:** persistent-scene model (above).
3. **New scenes render fully BLACK in the MP4 (fine in lint/inspect).** Cause:
   `immediateRender:false` on the transition `fromTo` — the seek jumped past the from-state.
   **Fix:** reveal opacity with `tl.set(scene,{opacity:1}, T)`; animate position separately.
4. **Incoming scene is an empty black panel during the slide.** Cause: content used
   `from({opacity:0})` timed after the scene landed. **Fix:** transform-only entrances (above).
5. **3D card-flip "blink" (edge-on flash).** Cause: a 180° Y flip is edge-on (≈0 width) at the
   midpoint. **Fix:** subtle carousel push, rotation ≤ ~20°, scenes stay full-facing.
6. **Transition leaves a black GAP in the middle.** Cause: different easings for in vs out
   and/or a scale-down to 0.92. **Fix:** same ease (`power3.inOut`) for both; scale ≥ 0.985.
7. **`<audio>` plays SILENT (render says `hasAudio:true`).** Cause: the `<audio>` had no `id`;
   the renderer discovers media by `id`. **Fix:** unique `id` on every `<audio>`.
8. **Fonts fall back to a generic family (`font_family_without_font_face`).** Cause: only
   `Inter`/`JetBrains Mono` auto-resolve; others need `@font-face`. **Fix:** add `@font-face`
   for each (local latin `*.woff2`) and never put a font behind `var()`. See `fonts.md`.
9. **`overlapping_clips_same_track` lint error.** Cause: two clips/audios overlap on one
   `data-track-index`. **Fix:** alternate `data-track-index` (or use the scene model for visuals;
   space SFX out).
10. **`content_overlap` — a huge number/word overlaps its label.** Cause: display font-size too
    large with tight line-height → glyph box overflows. **Fix:** reduce size, `line-height:1`,
    add explicit margin. (This is exactly what forced the captions highlight to be color-only,
    not scaled — see `captions.md`.)
11. **`multiple_root_compositions` lint error.** Cause: several root HTML files each have
    `data-composition-id`. **Fix:** exactly one `index.html` with it; render others via
    `render -c <file>`.
12. **inspect/lint ignore `-c`; only check `index.html`.** **Fix:** to validate a variant, make
    it the `index.html` (keep one canonical composition).
13. **Off-screen-parked scenes flagged as overflow (info).** Cause: `fromTo` with default
    `immediateRender:true` applies `x:1920` at build → inspect measures it off-canvas. **Fix:**
    use `tl.set(...)` at the transition time. Decorative `.glow`/watermark overflow is intentional
    — ignore or mark `data-layout-allow-overflow`.
14. **Real app screenshots can't be embedded in a local render.** Cause: the Chrome bridge's
    `save_to_disk` writes server-side, not to the local FS the renderer reads. **Fix:** recreate
    the screens as faithful animated HTML using the real data (looks better for motion graphics
    anyway). To embed literal rasters, the user must drop the PNGs into the project folder.

## Verification discipline

`lint` + `inspect` + `render` succeeding does **not** prove it looks right. **Always extract
frames with ffmpeg and actually Read them** — including a few *mid-transition* timestamps
(`boundary-0.1`, `boundary`, `boundary+0.2`) to catch 3D jank, gaps, blinks, and empty-incoming
panels that exist for only a few frames. See `render-pipeline.md`.
