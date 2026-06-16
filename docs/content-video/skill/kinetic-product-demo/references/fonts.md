# Fonts: brand vs. stylistic, and the `@font-face` gotcha

## The distinction that matters (read this)

These videos use two *separate* font layers. Keep them straight — conflating them is the exact
mistake this section exists to prevent.

- **Brand fonts (the identity).** For the example brand here: **Instrument Serif** (display /
  italic emphasis), **DM Sans** (body, weight 300), **JetBrains Mono** (labels / uppercase /
  mono). These carry the brand. The kinetic and cursor-flow variants use them for headlines, body,
  and mono labels.
- **Stylistic caption fonts (a detachable layer).** **Poppins** (geometric sans) + **Caveat**
  (handwritten cursive) were chosen *only* for the one-word captions template's look. **They are
  NOT the brand typeface.** Do not present "Poppins + Caveat" as the brand, do not pull them onto brand
  surfaces, and when reusing this skill for a different brand, swap them for that brand's chosen
  geometric-sans + cursive pair while leaving the brand identity fonts to the brand.

> The cursor-flow variant happens to use Poppins for its big `.display`/`.mult` too — treat that as
> a styling choice for that reel, swappable per brand, not a claim that Poppins is the brand font.

## The `@font-face` rules (Bug 8)

1. **Only `Inter` and `JetBrains Mono` auto-resolve** in HyperFrames. Every other family must have a
   real `@font-face` pointing at a local `fonts/*.woff2`, or it silently falls back to a system
   family. Counter-intuitively, JetBrains Mono "auto-resolves" as a *name* but if you want the real
   glyphs in the render you should still embed a woff2 (the as-built compositions reference it
   without embedding it, so it falls back to system monospace — supply a `JetBrainsMono.woff2` to be
   faithful).
2. **Never `font-family: var(--x)`.** The compiler's static scan can't see a font behind a CSS
   variable, so it won't bundle/await it. Use the **literal family name** in every rule.
3. **Use `font-display: block`** on render-critical faces so the renderer waits for the glyphs
   rather than screenshotting a fallback-flash frame (which would make the render non-deterministic).
4. **Download the Google Fonts `latin` subset** — it covers Spanish accents (á é í ó ú ñ ¿ ¡). Fetch
   the woff2 with a real browser User-Agent so Google serves woff2 (not ttf).

## The `@font-face` blocks (verbatim, as used)

Brand kit (kinetic / cursor variants):
```css
@font-face { font-family: "Instrument Serif"; font-style: normal; font-weight: 400; src: url("fonts/InstrumentSerif-Regular.woff2") format("woff2"); }
@font-face { font-family: "Instrument Serif"; font-style: italic; font-weight: 400; src: url("fonts/InstrumentSerif-Italic.woff2") format("woff2"); }
@font-face { font-family: "DM Sans"; font-style: normal; font-weight: 300 700; src: url("fonts/DMSans.woff2") format("woff2"); }
/* supply this one too so mono labels aren't system-fallback: */
@font-face { font-family: "JetBrains Mono"; font-style: normal; font-weight: 400 700; src: url("fonts/JetBrainsMono.woff2") format("woff2"); }
```

Stylistic caption layer (one-word captions template only):
```css
@font-face { font-family: "Poppins"; font-style: normal; font-weight: 600; font-display: block; src: url("fonts/Poppins-600.woff2") format("woff2"); }
@font-face { font-family: "Poppins"; font-style: normal; font-weight: 700; font-display: block; src: url("fonts/Poppins-700.woff2") format("woff2"); }
@font-face { font-family: "Caveat"; font-style: normal; font-weight: 600; font-display: block; src: url("fonts/Caveat-600.woff2") format("woff2"); }
```

## Sourcing woff2 (latin subset)

Each Google Fonts CSS endpoint returns `@font-face` blocks whose `src` points at the hosted woff2.
Hit it with a desktop browser UA so you get woff2, then download the specific subset URL:

```bash
# example: Poppins 600 + 700, Caveat 600 — request with a browser UA to get woff2 back
curl -s -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)" \
  "https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&family=Caveat:wght@600&display=block"
# then curl the latin-subset woff2 URLs from that CSS into fonts/Poppins-600.woff2 etc.
```

Name the files by family+weight (`Poppins-600.woff2`, `Caveat-600.woff2`, …) so the `@font-face`
`src` paths above resolve relative to the composition's `index.html`.
