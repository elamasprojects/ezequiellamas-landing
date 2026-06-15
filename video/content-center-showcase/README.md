# Content Center — showcase video (source)

HyperFrames composition for the `/content-center/demo/presentation-video` reel.
The rendered MP4 ships in `public/demo/cc-kinetic.mp4`; this folder is the source.

## Render

```bash
# from this folder
npx hyperframes@0.6.99 lint
npx hyperframes@0.6.99 inspect --at 2,5,8,11,14,17
npx hyperframes@0.6.99 render --output renders/kinetic.mp4
# then copy renders/kinetic.mp4 -> ../../public/demo/cc-kinetic.mp4
```

- `index.html` — the composition (6 scenes, 3D carousel transitions, GSAP timeline).
- `fonts/` — brand woff2 (Instrument Serif, DM Sans) embedded via `@font-face`.
- `vo.mp3` — voiceover (ElevenLabs, voice "Ezequiel" `ralfni8BZcLXadJWxyYJ`).
- `music.mp3` — background bed · `whoosh.mp3` — transition SFX (ffmpeg-synthesized).

Conventions, the audio/voice recipe, and the full bug→fix log live in
[`docs/content-video/`](../../docs/content-video/README.md).
