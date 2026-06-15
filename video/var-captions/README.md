# Content Center — showcase video · Variation B "Captions" (source)

HyperFrames composition for the `/content-center/demo/presentation-video` gallery.
The rendered MP4 ships in `public/demo/cc-captions.mp4`; this folder is the source.

Kinetic captions synced to the voiceover: word-by-word karaoke and full phrases
with the spoken keyword highlighted, combining Poppins with the handwritten
cursive Caveat (clip-path reveal).

## Render

```bash
# from this folder
npx hyperframes@0.6.99 lint
npx hyperframes@0.6.99 inspect --at 0.9,4,10.5,14.1,19
npx hyperframes@0.6.99 render --output renders/captions.mp4
# then copy renders/captions.mp4 -> ../../public/demo/cc-captions.mp4
```

- `index.html` — composition. `WORDS[]` = 62-entry voiceover word-timing table;
  `kara()` = karaoke (stacked spans, `tl.set` opacity swap per word.start),
  `full()` = full caption (entrance/hold/hard-kill + per-word color-pop highlight).
  Decorative `#bg-ghost` "CONTENT" watermark intentionally bleeds off both edges
  (the two HyperFrames `text_box_overflow` notes are that watermark, by design).
- `fonts/` — brand woff2 (Poppins 600/700, Caveat 600, DM Sans) via `@font-face`.
- `vo.mp3` — voiceover (ElevenLabs, voice "Ezequiel" `ralfni8BZcLXadJWxyYJ`).
- `music.mp3` — bed · `whoosh.mp3` — transition SFX · `click.mp3` / `tick.mp3` — UI SFX.

Conventions, the audio/voice recipe, and the full bug→fix log live in
[`docs/content-video/`](../../docs/content-video/README.md).
