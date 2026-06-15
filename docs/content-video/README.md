---
name: content-video
description: >
  Create branded product-showcase / motion-graphics videos for Ezequiel Lamas's
  content stack using HyperFrames (primary, HTML+GSAP) or Remotion (React,
  alternative). Use when asked to make a video, promo, presentation video,
  "social motion graphics", a product demo reel, or to add voiceover / music /
  SFX to a video. Encodes OUR brand system, our proven composition recipe, the
  ElevenLabs voice workflow, and the bug→fix log (see ERRORS.md) so we never
  re-hit the same problems. Trigger on: "video", "motion graphics", "showcase",
  "promo", "presentation video", "voz en off", "render con HyperFrames/Remotion".
---

# Content video stack (HyperFrames + Remotion)

How we make brand videos. Read this before authoring; read **[ERRORS.md](./ERRORS.md)**
before debugging — every gotcha we hit is logged there with cause + fix.

## Stack & when to use which

| Tool | Use it for | Install |
|---|---|---|
| **HyperFrames** (primary) | HTML + GSAP motion graphics, title cards, product showcases, audio-synced pieces. Renders to MP4 via headless Chrome. | `npx hyperframes@0.6.99 <cmd>` (also a devDep in the landing repo). Skills: `.agents/skills/` (installed via `npx skills add heygen-com/hyperframes`). |
| **Remotion 4.0.464** | React-component video, programmatic data-driven video, `@remotion/player` embeds. | Installed as deps in `ezequiellamas-landing` (matches `ugc-studio-hub`). |
| **ElevenLabs API** | Voiceover (Argentine voices, incl. Ezequiel's own clone) + (avoid) SFX. | Direct REST with `xi-api-key`. |
| **ffmpeg** | Frame extraction for visual verification, and **synthesizing SFX** (do NOT AI-generate whooshes). | On PATH. |

Default to **HyperFrames** for brand promos. The local CLI render is the path we
use — the HeyGen HyperFrames MCP `compose`/`render_video` are disabled in CLI.

## Brand system (videos)

Same identity as the landing (`src/index.css` `--ll-*`). Hard values:

- bg `#0a0a0a` · surface `#111111` · surface2 `#161616` · border `#232323`
- text `#e8e4de` · muted `#8a8580` · dim `#5a5550`
- accent (neon) `#c8ff00` · warm `#ff6b35` · blue `#4a9eff`
- platforms: IG `#d946ef` · YT `#ef4444` · TT `#06b6d4`
- Fonts: **Instrument Serif** (display, italic for emphasis), **DM Sans** (body, weight 300), **JetBrains Mono** (labels/uppercase).
- Visual language: dark, neon-accent, big serif headlines with one `<em>` accent word, mono eyebrows/kickers (accent + 5px left bar), rounded `--ll-surface` cards with a faint accent glow, real platform logos (monochrome SVG tinted to brand color).

**Fonts in HyperFrames:** only `Inter`/`JetBrains Mono` auto-resolve. Instrument
Serif + DM Sans need `@font-face` pointing at local `fonts/*.woff2` (download the
*latin* subset from Google Fonts). See ERRORS.md §"Fonts fall back".

## The proven HyperFrames recipe

Project lives **outside** the landing repo (e.g. `C:\PC\Projects\ezelamas-showcase`)
so node/render junk never pollutes the SPA. Only the rendered `.mp4` + poster go
into `landing/public/demo/`.

```bash
# 1. scaffold (once)
npx hyperframes@0.6.99 init <name> --non-interactive --skip-skills --resolution landscape --example blank
# 2. fonts/ — download latin woff2 (Instrument Serif reg+ital, DM Sans variable)
# 3. author index.html  (one standalone composition; see structure below)
# 4. validate FAST, then render
npx hyperframes@0.6.99 lint            # 0 errors required
npx hyperframes@0.6.99 inspect --at <t1,t2,...>   # 0 overflow errors (glow warnings OK)
npx hyperframes@0.6.99 render --output renders/<name>.mp4 --quiet
# 5. VERIFY VISUALLY — extract frames and Read them (render+inspect don't prove it looks right)
for t in 2 5 8 11 14 17; do ffmpeg -y -ss $t -i renders/<name>.mp4 -frames:v 1 frames/f_$t.png -loglevel error; done
# extract MID-TRANSITION frames too (e.g. boundary-0.1 .. boundary+0.2) to catch 3D jank
```

### Composition structure (what works)

- **Persistent scenes**, NOT clips with `data-start/data-duration`. Scene 1 visible;
  scenes 2..N have CSS `opacity:0`. One `data-composition-id="main"` root with
  `data-duration` = total. One `window.__timelines["main"]` GSAP timeline. This is
  the only model that doesn't produce content-blend between scenes (see ERRORS).
- **`#root { perspective: 1600-1900px }`** for 3D; `.scene { backface-visibility: hidden }`.
- **Transitions = `tl.set` + `tl.to` with the SAME ease for in & out** so the two
  scenes stay edge-to-edge (zero gap). Our `tH`/`tV` "3D carousel push":
  ```js
  function tH(o,n,t,dur,dir){ // dir +1 from right, -1 from left
    tl.set(n,{x:1920*dir, rotationY:-18*dir, scale:.985, opacity:1, transformOrigin:"50% 50%"},t);
    tl.to(n,{x:0, rotationY:0, scale:1, duration:dur, ease:"power3.inOut"},t);
    tl.to(o,{x:-1920*dir, rotationY:18*dir, scale:.985, duration:dur, ease:"power3.inOut"},t);
    tl.set(o,{opacity:0, x:0, rotationY:0, scale:1}, t+dur+.05);
  }
  ```
  Avoid full 180° card flips (edge-on "blink"). Keep rotation ≤ ~20°.
- **Content entrances on incoming scenes: transform-only `from` (NO `opacity:0`)** so
  the panel rides in *with its content visible* — never an empty black frame. The
  opener (scene 1) may use opacity (it appears on black). Data anims (count-ups,
  bar/chart/meter fills) play just after landing.
- Sync scene cut times to the **voiceover phrase boundaries** (see audio recipe).
- Rules: deterministic only (no `Math.random`/`Date.now`); GSAP animates visual
  props only; no `repeat:-1`; every `<audio>` needs a unique `id`.

## Audio recipe

`<audio id=... src=... data-start data-duration data-track-index data-volume>` as
direct children of `#root` (music track 1, VO track 2, SFX track 3). **Every audio
element MUST have an `id` or it renders SILENT** (see ERRORS).

### Voiceover — ElevenLabs (Argentine)

Use the **with-timestamps** endpoint so scene cuts line up with phrases:

```bash
curl -s -X POST "https://api.elevenlabs.io/v1/text-to-speech/<VOICE_ID>/with-timestamps?output_format=mp3_44100_128" \
  -H "xi-api-key: $KEY" -H "Content-Type: application/json" \
  --data '{"text":"...", "model_id":"eleven_multilingual_v2", "voice_settings":{"stability":0.5,"similarity_boost":0.8,"style":0.25,"use_speaker_boost":true}}' -o vo-ts.json
# decode audio_base64 -> vo.mp3 ; use alignment.character_start_times_seconds to find
# the start time of each phrase (= each scene boundary).
```

Argentine voices in the account (es): **`ralfni8BZcLXadJWxyYJ` = "Ezequiel"** (his own
clone — default for his personal-brand videos). Others: `D09EpJbk4um1HKSpeTSc` Agustin
(hyped/ad), `vgekQLm3GYiKMHUnPVvY` Agus (fast), `p7AwDmKvTdoHTBuueGvP` Malena.

### SFX & music

- **SFX (whoosh): synthesize with ffmpeg, do NOT AI-generate** — ElevenLabs
  `sound-generation` produced a metallic clang (see ERRORS §"Metallic clang"). A
  clean swish = filtered pink-noise envelope:
  ```bash
  ffmpeg -y -f lavfi -i "anoisesrc=d=0.55:c=pink:a=0.7:r=44100" \
    -af "highpass=f=180,lowpass=f=3200,afade=t=in:st=0:d=0.16:curve=qsin,afade=t=out:st=0.22:d=0.33:curve=qsin,volume=1.1,aformat=channel_layouts=stereo" \
    -ar 44100 -ac 2 whoosh.mp3
  ```
  Keep transition SFX subtle (`data-volume` ~0.35-0.4).
- **Music**: low bed (`data-volume` ~0.15). ElevenLabs `sound-generation` (≤22s) is
  acceptable for a subtle bed; keep it quiet so the VO carries.
- The demo `<video>` autoplays **muted** (browser policy) → add a "🔊 activá el
  sonido" hint; the VO/music only play once unmuted.

## Serving on the landing

MP4 + poster → `landing/public/demo/`. Vite copies `public/` to `dist/` root; Vercel
serves these static files before the SPA rewrite, so `/demo/<name>.mp4` works. Route:
`/content-center/demo/presentation-video` (`src/pages/ContentCenterDemo.tsx`).

## Remotion (alternative)

Installed in `ezequiellamas-landing` (deps, 4.0.464). Use `@remotion/player` to embed
a scrubbable composition in-app, or `@remotion/cli` to render MP4. Port HyperFrames →
Remotion only when the user explicitly wants the React/programmatic path; otherwise
HyperFrames is faster for brand promos. See the `remotion-to-hyperframes` and
`remotion-best-practices` skills.
