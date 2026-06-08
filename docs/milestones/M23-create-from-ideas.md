# M23 — "Crear a partir de ideas" + 3 adaptation modes

> Status: **in progress**. Builds on M22 (creator profile + editable prompts).
> Transcript refs: §2.2 (dedicated create-from-ideas section), §2.3 (3 modes),
> §2.4 (combine multiple ideas), §3.5 (adapt using the creator profile).

## Goal

A dedicated `/app/admin/crear` section that turns competitor ideas (from the
analyzed viral bank **or** a pasted URL) into the creator's own **short** scripts,
with three explicit adaptation modes and the ability to combine several ideas as
"ingredients". Reuses the existing `generate-script` pipeline (output schema,
profile injection from M22, motion graphics, validation).

## Scope decision
Long-form output from ideas is **deferred to M26** (it depends on the YouTube
long-form structure generator). M23 produces short scripts. The `crear` section
shows a "Largo" toggle disabled with a "Pronto (M26)" pill.

## What already exists (reused, not rebuilt)
- `generate-script`: profile injection (M22), single `referent_video_id` **or**
  `idea_reference_id`, binary `reference_mode` (`content_adapt` | `structure_only`).
- `AdaptToMyVoiceDialog.tsx`: per-video adapt, hardcodes `content_adapt`.
- M22 reserved slugs `adapt.copy` / `adapt.voice` / `adapt.instructions` + the
  `prompt_overrides` infra and "Prompts IA" tab.
- Idea sources: `referent_videos` (transcript + `concept_summary`) and
  `idea_references` (scraped URL, transcript only).
- **Missing:** the 3 explicit modes, multi-idea combining, the dedicated section.

## The 3 modes (transcript §2.3)
| Mode | slug | Behavior |
|---|---|---|
| Copiar | `adapt.copy` | Replicate the source idea/structure faithfully; translate to es-AR + clean filler; no new angle. |
| A mi voz | `adapt.voice` | Use the source as content seed, rewrite fully in the creator's voice/POV using the M22 profile (≈ today's `content_adapt`, made explicit). |
| Con instrucciones | `adapt.instructions` | Adapt the source following the user's written instructions (`raw_concept`). |

Each mode's instruction text is editable in the Prompts IA tab (override) and
falls back to a hardcoded default in `adapt-prompts.ts`.

## Implementation steps

### 1. Migration `m23_script_ingredients_and_adapt_mode`
- `ALTER TABLE scripts ADD COLUMN adapt_mode text` (nullable: `copy|voice|instructions`).
- New `script_ingredients` table: `id`, `script_id` (FK→scripts cascade),
  `owner_id`, `source_kind text` (`referent_video|idea_reference`),
  `source_id uuid`, `position int`, `created_at`. Triple-RLS like `scripts`.
- Keep `scripts.idea_reference_id` / `referent_video_id` populated with the first
  ingredient for back-compat with the IdeasInbox referent badge.
- Regenerate `src/lib/database.types.ts`.

### 2. Adapt-mode prompt defaults (edge)
- New `supabase/functions/generate-script/adapt-prompts.ts` →
  `ADAPT_PROMPT_DEFAULTS = { "adapt.copy", "adapt.voice", "adapt.instructions" }`.
- Re-export from `prompt.ts`; include in the `get-prompt-defaults` payload.
- Flip `comingSoon` off for `adapt.*` in `src/lib/api/promptOverrides.ts`.

### 3. `generate-script` accepts modes + multiple ingredients
- New body params: `adapt_mode?`, `ingredients?: {kind,id}[]`; reuse `raw_concept`
  as the instructions text for `instructions` mode.
- Load every ingredient (validate ownership + `transcript_status='done'`), build
  one combined reference block listing all sources (transcript + `concept_summary`
  when present), then one mode-instruction block resolved as
  `prompt_overrides["adapt."+mode] ?? ADAPT_PROMPT_DEFAULTS[...]`.
- Persist `script_ingredients` rows + `scripts.adapt_mode`.
- Back-compat: existing single-`referent_video_id` callers unchanged.

### 4. New section `/app/admin/crear`
- Route in `App.tsx` (lazy `CrearPage`), nav in `AdminLayout.tsx`.
- `src/pages/app/admin/crear/`: `CrearPage.tsx`, `IngredientPicker.tsx`
  (pick 1+ from the referent-video bank and/or add an idea by URL via
  `scrapeIdeaReference`), `ModeSelector.tsx` (Copiar/A mi voz/Con instrucciones;
  instructions reveals a textarea), optional format/shape/series/part selects,
  short|largo(disabled) toggle. Generate → `generateScript({ingredients,adapt_mode,…})`
  → navigate to `/app/admin/ideas/:id`.
- Extend `GenerateScriptInput` in `src/lib/api/generation.ts`.

### 5. Refactor `AdaptToMyVoiceDialog`
- Becomes a thin entry that seeds the shared flow with one referent video +
  `adapt_mode:"voice"` (keeps the per-video "Adaptar a mi voz" affordance, now
  mode-aware).

### 6. Verification
- Migration + RLS via SQL; types regen; `npm run build` + eslint; `deno lint`.
- E2E: pick 2 referent videos + 1 idea URL, run each mode, confirm a script is
  created, `script_ingredients` has 3 rows, `adapt_mode` set, output reflects the
  mode. Legacy dialog still works. Deploy `generate-script` + `get-prompt-defaults`.
