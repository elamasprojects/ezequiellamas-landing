# Variant A — Cursor-flow ("the app in motion")

**Brief (verbatim intent):** "elementos grandes o screenshots moviéndose que muestren la
aplicación… el flujo está animado. Me gustan las animaciones de un mouse haciendo clic en un
botón, agregando un efecto de sonido de clic. Después que el botón tenga una reacción a ese clic
y que de ahí haya una transición y pase algo." → Big elements, fewer tiny numbers/text, app
mockups (browser/phone) in motion, and an animated cursor that **clicks a real-looking button →
click SFX → button reacts → a transition fires and the next thing happens.**

Builds on `seek-safe-model.md` (persistent scenes + `tH`/`tV` transitions + transform-only
entrances). This file adds the cursor rig, the `clickFX()` helper, and the device mocks. The
reference build is 6 scenes, 1920×1080, 19.7s.

## 1. The cursor + ripple rig (global, above all scenes)

One global SVG cursor and one ripple span live **outside** every `.scene` so they float over the
whole composition. Move the cursor with pure GSAP transforms.

```html
<!-- GLOBAL cursor + ripple (siblings of the scenes, not inside one) -->
<svg id="cursor" width="30" height="34" viewBox="0 0 26 30"><path d="M2 2 L2 22 L8 16 L12 25 L15 24 L11 15 L20 15 Z" fill="#0a0a0a" stroke="#c8ff00" stroke-width="1.6" stroke-linejoin="round"/></svg>
<span id="ripple"></span>
```

```css
#cursor { position: absolute; left: 0; top: 0; z-index: 50; filter: drop-shadow(0 5px 12px rgba(0,0,0,0.6)); will-change: transform; }
#ripple { position: absolute; left: 0; top: 0; z-index: 49; width: 26px; height: 26px; border-radius: 50%; border: 3px solid var(--accent); opacity: 0; transform: translate(-50%, -50%) scale(0); pointer-events: none; will-change: transform, opacity; }
```

Cursor travel: start off-screen, drift across the opener, then a small reusable helper tweens it
to each button so it *arrives* exactly when the press fires. The `-4,-4` offset lands the SVG tip
(not its top-left) on the target.

```js
tl.set("#cursor", { x: -200, y: 1200 }, 0);                                            // off-screen
tl.fromTo("#cursor", { x: -200, y: 1150 }, { x: 1300, y: 300, duration: 2.6, ease: "power1.inOut" }, 0.4); // S1 drift

function moveCursor(bx, by, atArrive, dur) {
  tl.to("#cursor", { x: bx - 4, y: by - 4, duration: dur, ease: "power2.inOut" }, atArrive - dur);
}
moveCursor(1430, 612, 4.95, 0.9);   // → S2 refresh button (arrives just before clk1@5.05)
moveCursor(430, 685, 7.95, 0.9);    // → S3 "Generar con IA"  (before clk2@8.05)
moveCursor(960, 832, 11.6, 0.7);    // → S4 "Publicar"        (before clk3@11.7)
// final CTA click uses an inline fromTo so the cursor sweeps up from below:
tl.fromTo("#cursor", { x: 200, y: 1150 }, { x: 960, y: 712, duration: 0.85, ease: "power2.inOut" }, 16.7);
tl.to("#cursor", { opacity: 0, duration: 0.4 }, 18.4); // hide at the end
```

## 2. `clickFX()` — the signature press → ripple → button reaction

One helper does all four things at a press timestamp `tPress`: the cursor presses (scale down then
overshoot back), the ripple ring expands and fades, the target button dips and springs back, and an
accent glow flashes around it. Copy verbatim.

```js
function clickFX(bx, by, btnSel, tPress) {
  // cursor press
  tl.to("#cursor", { scale: 0.8, duration: 0.07, ease: "power2.in" }, tPress);
  tl.to("#cursor", { scale: 1, duration: 0.16, ease: "back.out(3)" }, tPress + 0.07);
  // ripple ring
  tl.set("#ripple", { x: bx, y: by, scale: 0, opacity: 0.9 }, tPress);
  tl.to("#ripple", { scale: 11, opacity: 0, duration: 0.5, ease: "power2.out" }, tPress);
  // button reaction (dip + spring)
  tl.to(btnSel, { scale: 0.95, duration: 0.07, ease: "power2.in" }, tPress);
  tl.to(btnSel, { scale: 1, duration: 0.3, ease: "back.out(2.2)" }, tPress + 0.07);
  // accent glow flash
  tl.fromTo(btnSel, { boxShadow: "0 0 0 0 rgba(200,255,0,0)" }, { boxShadow: "0 0 30px 7px rgba(200,255,0,0.6)", duration: 0.16, ease: "power2.out" }, tPress);
  tl.to(btnSel, { boxShadow: "0 0 0 0 rgba(200,255,0,0)", duration: 0.5, ease: "power2.in" }, tPress + 0.18);
}
```

### Click choreography: each click *triggers* the next beat

The point of the brief is that the click **causes** something. Fire the action a hair *after* the
press (`tPress + 0.1…0.15`), and place the scene transition right after. Reference timings:

| Click | `tPress` | Target button | What the click triggers (just after) |
|---|---|---|---|
| 1 | `5.05` | `#s2-refresh` ("↻ Refrescar métricas") | metric bars reset to `scaleX:0` @5.12 then refill staggered |
| 2 | `8.05` | `#s3-gen` ("✨ Generar con IA") | guion rows `#s3-rows .grow` cascade in (x:40→0, stagger 0.13) @8.15 |
| 3 | `11.7` | `#s4-pub` ("Publicar ahora →") | the 3 platform logos shoot up + fade (y:-120/-140/-120) @11.85 |
| 4 (final) | `17.6` | `#s6-btn` ("Sumate a la lista →") | URL `#s6-url` fades up @17.85; cursor hidden @18.4 |

```js
clickFX(1430, 612, "#s2-refresh", 5.05);
tl.set("#s2 .pbar i", { scaleX: 0 }, 5.12);
tl.to("#s2 .pbar i", { scaleX: 1, duration: 0.6, ease: P4, stagger: 0.08 }, 5.12);

clickFX(430, 685, "#s3-gen", 8.05);
tl.from("#s3-rows .grow", { x: 40, opacity: 0, duration: 0.4, ease: P3, stagger: 0.13 }, 8.15);

clickFX(960, 832, "#s4-pub", 11.7);
tl.to("#s4-ig", { y: -120, scale: 0.7, opacity: 0.85, duration: 0.5, ease: "power2.in" }, 11.85);
tl.to("#s4-yt", { y: -140, scale: 0.7, opacity: 0.85, duration: 0.5, ease: "power2.in" }, 11.9);
tl.to("#s4-tt", { y: -120, scale: 0.7, opacity: 0.85, duration: 0.5, ease: "power2.in" }, 11.95);

clickFX(960, 712, "#s6-btn", 17.6);
tl.from("#s6-url", { y: 16, opacity: 0, duration: 0.5, ease: P3 }, 17.85);
```

**Sync the click SFX by timestamp coincidence**, not by code: the `<audio>` click element's
`data-start` simply equals each `tPress` (5.05 / 8.05 / 11.7 / 17.6). See `audio-voice-sfx.md`.

## 3. Device mocks (browser + phone)

The "screenshots in motion" are recreated app screens inside mock chrome — never literal rasters
(see Bug 14). A browser frame with traffic-light dots + URL bar, and a phone frame.

```css
.device { position: relative; background: #0d0d0d; border: 1px solid #1d1d1d; box-shadow: 0 50px 130px -30px rgba(0,0,0,0.85), 0 0 0 1px rgba(200,255,0,0.04); will-change: transform; }
.device--browser { width: 1180px; border-radius: 18px; overflow: hidden; }
.dbar { display: flex; align-items: center; gap: 9px; height: 46px; padding: 0 18px; background: #0c0c0c; border-bottom: 1px solid #191919; }
.dot { width: 12px; height: 12px; border-radius: 50%; }
.dot.r { background: #ff5f57 } .dot.y { background: #febc2e } .dot.g { background: #28c840 }
.durl { margin-left: 16px; padding: 6px 16px; border-radius: 8px; background: #161616; color: #7a7a7a; font-family: "JetBrains Mono", monospace; font-size: 15px; }
.dview { position: relative; height: 660px; overflow: hidden; background: #0a0a0a; }
.screen { position: absolute; inset: 0; padding: 44px 50px; will-change: transform; }
.device--phone { width: 360px; border-radius: 46px; padding: 14px; }
.device--phone .dview { height: 720px; border-radius: 34px; }
```

```html
<div class="device device--browser" id="s2-dev">
  <div class="dbar"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span><span class="durl">app.example.com/app/admin</span></div>
  <div class="dview"><div class="screen" id="s2-screen"> … recreated screen … </div></div>
</div>
```

Give the device a transform-only entrance so it rides in visible:
```js
tl.from("#s2-dev", { y: 60, scale: 0.95, rotationX: 8, transformPerspective: 1200, duration: 0.7, ease: P3 }, 3.5);
```

## 4. Big elements, big logos, the gauge, and the cursive accent

The brief wants BIG and few-small. Use a large display face for headlines and a giant number for
the hero stat; keep platform logos large (inline SVG in brand colors).

```css
.display { font-family: "Poppins"; font-weight: 700; letter-spacing: -0.02em; color: var(--text); line-height: 0.98; text-align: center; }
.display .ac { color: var(--accent); }
.mult { font-family: "Poppins"; font-weight: 700; font-size: 300px; color: var(--accent); line-height: 0.9; } /* big multiplier, e.g. "5×" */
.biglogo { width: 220px; height: 220px; }
.biglogo svg { width: 100%; height: 100%; display: block; }
.script { font-family: "Caveat"; font-weight: 600; color: var(--accent); } /* handwritten accent word */
```

As-built display sizes (inline per scene): S1 title `172px`, S3 `120px`, S4 `96px`, S6 `144px`;
the `.mult` gauge overridden to `184px; line-height:1; margin-top:66px` (its 300px base overflowed
— Bug 10). Caveat accent words ("marca", "explotar", "solo lugar") sized 60–64px inline and
revealed left-to-right with a clip-path wipe:

```js
tl.set("#s1-sub .script", { clipPath: "inset(0 100% 0 0)" }, 0);
tl.to("#s1-sub .script", { clipPath: "inset(0 0% 0 0)", duration: 0.5, ease: "none" }, 2.55);
```

> Fonts note: **Poppins/Caveat here are a stylistic layer, not the brand.** When reusing this rig
> for a different brand, swap `.display`/`.mult` to that brand's display face and treat `.script`
> as a detachable accent. See `fonts.md`.

## 5. Cursor-flow checklist

- [ ] Global `#cursor` + `#ripple` are siblings of the scenes (z-index 50/49), not inside one.
- [ ] Cursor *arrives* at each button just before its `tPress` (use `moveCursor`).
- [ ] Each `clickFX(bx,by,btnSel,tPress)` fires; the triggered action runs at `tPress + ~0.1`.
- [ ] A click `<audio>` has `data-start === tPress` for every visual click.
- [ ] Device mocks recreate the screen (no literal rasters); device enters transform-only.
- [ ] Big display/logos/number; tiny text minimized per the brief.
