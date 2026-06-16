# Template — One-word captions (karaoke + full captions)

> **Template name: "one-word captions."** The name reflects its signature look — **one word
> per frame**, swapping nearly instantly, which is far more visual than a static subtitle line.
> The template also includes a full multi-word caption mode (`full()`) for some phrases, but the
> one-word karaoke (`kara()`) is its identity. This is one of two templates in the library today
> (the other is **cursor-flow**); more will be added — see `../SKILL.md`.

**Brief (verbatim intent):** "en la parte en la que se dice algo importante, se haga un highlight
en el texto que se está diciendo, poniendo captions/subtítulos… un solo caption a la vez, una
palabra a la vez, que cambie prácticamente al instante… en otras partes, captions enteros, cuatro
o cinco palabras a la vez, combinando una tipografía [geométrica]… y otra más itálica/cursiva…
que la cursiva tenga algún tipo de animación cuando se escribe."

→ Subtitles synced to the voiceover: **karaoke** (one word at a time, swapping nearly instantly) in
key moments, **full captions** (4–5 words, spoken keyword highlighted) elsewhere, combining a
geometric sans with an **animated handwritten cursive**.

Builds on `seek-safe-model.md`. Two helpers — `kara()` and `full()` — drive everything off the same
word-timing table. Reference build is 1920×1080, 19.7s (VO 19.55s).

## 1. The word-timing table (`W`)

The VO is generated with ElevenLabs `/with-timestamps`, which returns per-character start times.
Collapse those into per-word `[text, start, end]` triples (seconds), then map to `{t,s,e}` objects.
See `audio-voice-sfx.md` for the generation step. As-built it's 62 words:

```js
const W = [
  ["Esto",0.00,0.36],["es",0.36,0.70],["Content",0.70,1.09],["Center",1.09,1.65],
  ["El",1.65,1.82],["estudio",1.82,2.19],["donde",2.19,2.46],["corro",2.46,2.73],
  ["toda",2.73,2.93],["mi",2.93,3.05],["marca",3.05,3.61], /* … */
  ["Sumate",18.26,18.73],["a",18.73,18.79],["la",18.79,18.89],["lista",18.89,19.55]
].map(function(w){ return { t: w[0], s: w[1], e: w[2] }; });
```

`t` = word text, `s` = spoken start, `e` = spoken end. Everything downstream keys off `s`/`e`, so
the captions are sample-accurate to the voice with zero manual nudging.

## 2. `kara()` — one word at a time (seek-safe stacked spans)

All words in a range are stacked (absolutely positioned, overlapping on the same center point) and
all start `opacity:0`. At each word's start `s`, a `tl.set` shows it and another `tl.set` hides the
previous one — an **instantaneous swap**. Because they're `tl.set` keyframes on a paused timeline,
scrubbing to any frame resolves exactly one visible word (fully seek-safe). The last word is killed
explicitly at its own `e` (nothing else swaps it out).

```js
// ---------- KARAOKE: one word at a time (seek-safe stacked spans) ----------
function kara(a, b, opts) {
  opts = opts || {};
  var blk = document.createElement("div"); blk.className = "blk"; stage.appendChild(blk);
  var spans = [];
  for (var i = a; i <= b; i++) {
    var w = W[i];
    var el = document.createElement("span");
    el.className = "kw";
    if (opts.big && opts.big.indexOf(i) >= 0) el.className += " big";
    if (opts.cav && opts.cav.indexOf(i) >= 0) el.className += " cav";
    if (opts.logo && opts.logo[i]) { el.className += " big"; el.style.color = opts.logo[i].c; el.innerHTML = '<span class="lg">' + LOGO[opts.logo[i].k] + '</span>' + w.t; }
    else el.textContent = w.t;
    blk.appendChild(el); spans.push(el);
    tl.set(el, { opacity: 0, scale: 1 }, 0);
  }
  for (var j = a; j <= b; j++) {
    var k = j - a, w2 = W[j], el2 = spans[k];
    tl.set(el2, { opacity: 1 }, w2.s);
    if (k > 0) tl.set(spans[k - 1], { opacity: 0 }, w2.s);
    var isCav = opts.cav && opts.cav.indexOf(j) >= 0;
    if (isCav) { tl.fromTo(el2, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: Math.min(0.5, w2.e - w2.s), ease: "none" }, w2.s); }
    else { tl.fromTo(el2, { scale: 0.84, y: 14 }, { scale: 1, y: 0, duration: 0.12, ease: "back.out(2.2)" }, w2.s); }
  }
  tl.set(spans[spans.length - 1], { opacity: 0 }, W[b].e); // kill last
}
```

Options: `opts.big` = indices to enlarge in accent color; `opts.cav` = indices rendered in cursive
(clip-path reveal instead of the pop); `opts.logo` = `{ index: {k, c} }` to prepend an inline
platform SVG (`k` = key into a `LOGO` map) and tint the word color `c`. Non-cav words get a 0.12s
`back.out(2.2)` micro-pop.

## 3. `full()` — 4–5 words with the spoken word highlighted

The whole line enters once, holds while a per-word color highlight sweeps through it in sync with
the voice, then hard-exits. The highlight is **color-only** — see the pitfall below.

```js
// ---------- FULL CAPTION: 4-5 words, spoken word highlighted ----------
function full(a, b, opts) {
  opts = opts || {};
  var cap = document.createElement("div"); cap.className = "cap"; stage.appendChild(cap);
  var spans = [];
  for (var i = a; i <= b; i++) {
    var w = W[i];
    var sp = document.createElement("span");
    sp.className = "w" + (opts.cav && opts.cav.indexOf(i) >= 0 ? " cav" : "");
    sp.textContent = w.t;
    cap.appendChild(sp);
    cap.appendChild(document.createTextNode(" "));
    spans.push(sp);
  }
  // entrance / hold / exit (deterministic kill)
  var start = W[a].s, end = W[b].e;
  tl.set(cap, { opacity: 0, y: 28, scale: 0.96 }, 0);
  tl.to(cap, { opacity: 1, y: 0, scale: 1, duration: 0.28, ease: "power3.out" }, start);
  tl.to(cap, { opacity: 0, y: -22, duration: 0.16, ease: "power2.in" }, end - 0.16);
  tl.set(cap, { opacity: 0 }, end);
  // per-word highlight (color pop on the spoken word)
  for (var j = a; j <= b; j++) {
    var k = j - a, w2 = W[j], el = spans[k];
    var isCav = opts.cav && opts.cav.indexOf(j) >= 0;
    tl.to(el, { color: "#c8ff00", duration: 0.1, ease: "power2.out" }, w2.s);
    tl.to(el, { color: isCav ? "#c8ff00" : "#ffffff", duration: 0.16, ease: "power2.out" }, w2.e);
  }
}
```

The `tl.set(cap, {opacity:0}, end)` after the exit tween is the **deterministic kill** — it
guarantees a clean off-state at any seek position regardless of where the tween left things. Cav
words stay accent-green (their "off" color is also `#c8ff00`).

> **Pitfall (Bug 10):** the original plan highlighted with `color + scale:1.12`. Scaling a word
> mid-line pushed its glyph box into its neighbors and tripped `content_overlap` in `inspect`.
> The fix was to make the highlight **color-only** (no scale), and to drop `.cap` to `78px` with
> `line-height:1.2` and per-word margins. Keep highlights color-only unless you re-check overlap.

## 4. Handwritten cursive (Caveat) — the "writes itself" reveal

Cursive words use a clip-path wipe so they appear to be written left-to-right. Linear ease keeps the
"pen speed" constant; cap the reveal at 0.5s or the spoken duration, whichever is shorter.

```css
.kw.cav { font-family: "Caveat"; font-weight: 600; font-size: 230px; color: var(--accent); }
.cap .cav { font-family: "Caveat"; font-weight: 600; font-size: 1.35em; color: var(--accent); }
```
```js
// (inside kara, for a cav word) — left→right handwriting wipe:
tl.fromTo(el2, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: Math.min(0.5, w2.e - w2.s), ease: "none" }, w2.s);
```
In `full()`, cav words do **not** get the wipe — they only carry the color-pop and stay accent-green.

## 5. Wiring the blocks (as-built sequence)

Each call covers a slice of `W`. `big`/`cav`/`logo` (kara) and `cav` (full) are the levers.

```js
kara(0, 10, { big: [2, 3], cav: [10] });                 // "Esto es Content Center … marca"(cav)
full(11, 16, { hi: [12, 16] });                          // "Tus métricas de todas las plataformas"
full(17, 20, { hi: [20] });                              // "en una sola pantalla"
kara(21, 30, { big: [23, 26], logo: {} });               // "De una idea a un guion … I A"
kara(31, 39, { big: [], logo: { 33:{k:"ig",c:"#d946ef"}, 34:{k:"yt",c:"#ef4444"}, 36:{k:"tt",c:"#06b6d4"} } }); // Instagram/YouTube/TikTok
full(40, 50, { hi: [47], cav: [47] });                   // "… va a explotar(cav) antes de subirlo"
full(51, 57, { hi: [51], cav: [57] });                   // "Todo tu contenido … lugar"(cav)
kara(58, 61, { big: [58], cav: [61] });                  // "Sumate a la lista"(cav)
tl.to("#url", { opacity: 1, duration: 0.5, ease: "power2.out" }, 18.7);
```

Platform color map (load-bearing): Instagram `#d946ef` · YouTube `#ef4444` · TikTok `#06b6d4`.
Note: `opts.hi` is accepted but the as-built loop color-pops *every* word in a `full()` line, so
`hi` is effectively documentation of which word is the "important" one rather than a behavior switch.

## 6. The always-moving backdrop + progress bar

Captions over a still background violate the "nothing static" rule. Four ambient layers guarantee
motion every frame: a grid that drifts + de-zooms over the full duration, a glow that "breathes"
via chained `sine.inOut` tweens, a giant faded watermark word that settles then slowly drifts, and
a VO progress bar that linearly fills the whole time.

```html
<div id="bg">
  <div class="grid" id="bg-grid"></div>
  <div class="glow" id="bg-glow"></div>
  <div class="ghost" id="bg-ghost">CONTENT</div>
</div>
<div id="prog"><i id="pbar"></i></div>
```
```css
#bg { position: absolute; inset: 0; overflow: hidden; }
#bg .grid { position: absolute; inset: -12%; background-image: linear-gradient(#151515 1px, transparent 1px), linear-gradient(90deg, #151515 1px, transparent 1px); background-size: 120px 120px; -webkit-mask-image: radial-gradient(circle at 50% 50%, #000, transparent 75%); mask-image: radial-gradient(circle at 50% 50%, #000, transparent 75%); opacity: 0.4; will-change: transform; }
#bg .glow { position: absolute; width: 1500px; height: 1500px; top: 50%; left: 50%; border-radius: 50%; filter: blur(40px); background: radial-gradient(circle, rgba(200,255,0,0.10), transparent 62%); transform: translate(-50%, -50%); will-change: transform, opacity; }
#bg .ghost { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-family: "Poppins"; font-weight: 700; font-size: 520px; color: rgba(255,255,255,0.025); white-space: nowrap; will-change: transform, opacity; pointer-events: none; }
#prog { position: absolute; left: 150px; right: 150px; bottom: 120px; height: 4px; border-radius: 99px; background: #1c1c1c; overflow: hidden; }
#prog i { display: block; height: 100%; width: 0; border-radius: 99px; background: linear-gradient(90deg, var(--accent), var(--warm)); }
```
```js
tl.fromTo("#bg-grid", { y: 0, scale: 1.05 }, { y: -90, scale: 1.0, duration: 19.7, ease: "none" }, 0);
tl.fromTo("#bg-glow", { scale: 0.9, opacity: 0.7 }, { scale: 1.15, opacity: 1, duration: 6, ease: "sine.inOut" }, 0);
tl.to("#bg-glow", { scale: 0.95, opacity: 0.8, duration: 7, ease: "sine.inOut" }, 6);
tl.to("#bg-glow", { scale: 1.1, opacity: 1, duration: 6.7, ease: "sine.inOut" }, 13);
tl.fromTo("#bg-ghost", { scale: 1.12, opacity: 0 }, { scale: 1.0, opacity: 1, duration: 1.4, ease: "power2.out" }, 0.2);
tl.to("#bg-ghost", { y: -50, duration: 18.5, ease: "none" }, 0.6);
tl.to("#pbar", { width: "100%", duration: 19.55, ease: "none" }, 0); // progress bar — never static
```

> The watermark is intentionally `520px` — much wider than the frame — so it bleeds off both edges.
> `inspect` will emit a `text_box_overflow` note for it; that is by design, not a defect (Bug 13).

## 7. Fonts used here (and the brand caveat)

| Family | Weight / file | Used for |
|---|---|---|
| **Poppins** | 700 (`Poppins-700.woff2`) | karaoke `.kw` (150px) + `.kw.big` (196px) + the ghost watermark (520px) |
| **Poppins** | 600 (`Poppins-600.woff2`) | full captions `.cap` (78px) |
| **Caveat** | 600 (`Caveat-600.woff2`) | cursive `.kw.cav` (230px) + `.cap .cav` (1.35em) |

**Poppins + Caveat are the stylistic caption layer — they are NOT the brand typeface.** The brand
fonts are Instrument Serif / DM Sans / JetBrains Mono. Do not pull Poppins/Caveat onto brand
surfaces, and when reusing this for another brand, swap the geometric sans + cursive for that
brand's chosen pair. All render-critical faces use `font-display: block`. See `fonts.md`.

## 8. One-word captions checklist

- [ ] `W` built from real `/with-timestamps` word timings (not eyeballed).
- [ ] `kara()` swaps with `tl.set` opacity (seek-safe); last word killed at its `e`.
- [ ] `full()` enters once, holds, hard-kills with `tl.set(opacity:0, end)`.
- [ ] Highlight is **color-only** (re-run `inspect` if you add scale).
- [ ] Cav words wipe via clip-path in `kara`; color-only in `full`.
- [ ] Backdrop has ≥1 layer moving every frame + progress bar filling.
