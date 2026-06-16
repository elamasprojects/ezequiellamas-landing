# Audio: voiceover, SFX, music, and wiring

Audio in HyperFrames is **declarative** — `<audio>` tags as direct children of `#root`, scheduled by
attributes, no JS. The three load-bearing facts: every `<audio>` needs a unique `id` (or it renders
**silent** — Bug 7), tracks are separated by `data-track-index`, and SFX sync to visuals by
**timestamp coincidence** (the SFX `data-start` equals the transition time or the click `tPress`).

## Track layout

| `data-track-index` | Content | `data-volume` |
|---|---|---|
| 1 | music bed | ~0.15 |
| 2 | voiceover | 1 |
| 3 | whoosh (transitions) | ~0.36–0.38 |
| 4 | click / tick (cursor variant) | ~0.8 (final 0.9) |

```html
<audio id="aud-music" src="music.mp3"  data-start="0"    data-duration="19.7"  data-track-index="1" data-volume="0.15"></audio>
<audio id="aud-vo"    src="vo.mp3"      data-start="0"    data-duration="19.55" data-track-index="2" data-volume="1"></audio>
<audio id="aud-wh1"   src="whoosh.mp3"  data-start="3.31" data-duration="0.55"  data-track-index="3" data-volume="0.36"></audio>
<!-- one whoosh per transition: data-start === the tH/tV time (3.31 / 6.27 / 9.31 / 12.68 / 15.52) -->
<audio id="aud-clk1"  src="click.mp3"   data-start="5.05" data-duration="0.18"  data-track-index="4" data-volume="0.8"></audio>
<!-- one click per cursor press: data-start === clickFX tPress (5.05 / 8.05 / 11.7 / 17.6) -->
```

## Voiceover — ElevenLabs, with word-level timestamps

Use the **`/with-timestamps`** endpoint (not the plain TTS one) — it returns character-level start
times you collapse into per-word `{t,s,e}` for caption sync and per-scene cut anchoring. Call the
REST API directly with `xi-api-key`.

```bash
curl -s -X POST "https://api.elevenlabs.io/v1/text-to-speech/<VOICE_ID>/with-timestamps?output_format=mp3_44100_128" \
  -H "xi-api-key: $KEY" -H "Content-Type: application/json" \
  --data '{"text":"…", "model_id":"eleven_multilingual_v2", "voice_settings":{"stability":0.5,"similarity_boost":0.8,"style":0.25,"use_speaker_boost":true}}' \
  -o vo-ts.json
# response: decode .audio_base64 -> vo.mp3 ; use .alignment.character_start_times_seconds
# to derive each word's start (= caption sync) and each sentence's start (= scene cut anchor).
```

Exact voice settings used: `model_id: eleven_multilingual_v2`, `stability 0.5`, `similarity_boost
0.8`, `style 0.25`, `use_speaker_boost true`, output `mp3_44100_128`.

Argentine-Spanish voice IDs (es):
- **`ralfni8BZcLXadJWxyYJ` = "Ezequiel"** — the personal-brand clone; default for these videos.
- `D09EpJbk4um1HKSpeTSc` = Agustin (hyped/ad) · `vgekQLm3GYiKMHUnPVvY` = Agus (fast) ·
  `p7AwDmKvTdoHTBuueGvP` = Malena.

**Cut anchoring:** place each scene transition ~0.25–0.35s *before* its sentence start, so the new
scene is already settling as the phrase begins. (Reference cuts: 3.31 / 6.27 / 9.31 / 12.68 / 15.52
for sentence starts 3.61 / 6.57 / 9.61 / 12.98 / 15.82.)

## SFX — synthesize with ffmpeg, NEVER AI-generate

ElevenLabs `sound-generation` adds a **metallic clang** transient (Bug 1) that lands on every
transition. A clean whoosh is just filtered pink-noise with a smooth `qsin` in/out envelope:

```bash
ffmpeg -y -f lavfi -i "anoisesrc=d=0.55:c=pink:a=0.7:r=44100" \
  -af "highpass=f=180,lowpass=f=3200,afade=t=in:st=0:d=0.16:curve=qsin,afade=t=out:st=0.22:d=0.33:curve=qsin,volume=1.1,aformat=channel_layouts=stereo" \
  -ar 44100 -ac 2 whoosh.mp3
```

A click (cursor variant) is a short broadband impulse with a fast exp fade + lowpass — synthesize it
the same way (short noise/impulse, sharp envelope), keep it ~0.12–0.18s, and tuck it under the press
at `data-volume ~0.8`. Keep whooshes subtle (~0.36–0.38) so they don't fight the VO.

## Music bed

A low ambient `music.mp3` at `data-volume 0.15`, spanning the whole composition. ElevenLabs
`sound-generation` (≤22s) is acceptable for a *subtle* bed — keep it quiet so the voice carries.

## Playback in the app (browser autoplay policy)

A demo `<video>` can only autoplay if **muted** — so VO/music are inaudible until the user unmutes.
Add a "🔊 activá el sonido" hint near the player, autoplay only the first/featured video muted, and
let the rest play on demand. (This is why the gallery on the consuming site autoplays only the
featured reel and shows the sound note.)
