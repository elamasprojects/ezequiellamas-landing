# Content Center — showcase video · Variation A "Cursor-flow" (source)

HyperFrames composition for the `/content-center/demo/presentation-video` gallery.
The rendered MP4 ships in `public/demo/cc-cursor.mp4`; this folder is the source.

Big elements + app screens in motion: a cursor clicks real buttons (with a click
SFX, button press-reaction and a transition on each click) walking through the
product flow.

## Render

```bash
# from this folder
npx hyperframes@0.6.99 lint
npx hyperframes@0.6.99 inspect --at 5,8,11.7,17.6
npx hyperframes@0.6.99 render --output renders/cursor.mp4
# then copy renders/cursor.mp4 -> ../../public/demo/cc-cursor.mp4
```

- `index.html` — composition (6 scenes, global cursor + `clickFX()`, device mocks).
- `fonts/` — brand woff2 (Poppins, Caveat, DM Sans) embedded via `@font-face`.
- `vo.mp3` — voiceover (ElevenLabs, voice "Ezequiel" `ralfni8BZcLXadJWxyYJ`).
- `music.mp3` — bed · `whoosh.mp3` — transition SFX · `click.mp3` / `tick.mp3` — UI SFX.

Conventions, the audio/voice recipe, and the full bug→fix log live in
[`docs/content-video/`](../../docs/content-video/README.md).
