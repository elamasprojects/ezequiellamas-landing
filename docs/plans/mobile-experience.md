# Mobile experience plan — thumb-first, capture-on-the-fly

> Status: plan (not started). Target: the authenticated `/app/admin/*` area as a
> phone-native PWA. Desktop layout stays as-is.

## Context & goal
The admin app is desktop-shaped: a 60px sidebar that collapses to a left
hamburger `Sheet` on mobile, dense tables, and no thumb-zone navigation. On a
phone the creator wants to **capture an idea in seconds** and glance at a few
high-value flows — not hunt through an 18-item drawer. This plan makes mobile a
**dedicated, thumb-reachable, input-first experience** without forking the app:
one responsive codebase, mobile-only chrome layered on the existing shell.

**Decisions (from the user):**
- **Primary phone job: "Capturar al vuelo"** → optimize for speed-of-input; the
  hero is quick-capture.
- **One-tap features:** Capturar idea, YouTube Studio, Publicaciones/Calendario,
  Crear desde referente. (Notifications stay as the header bell.)

## Current state (audit)
- **Shell:** `DashboardShell.tsx` — desktop sidebar (`hidden md:block`), mobile
  hamburger → `MobileNav.tsx` left `Sheet`. Safe-area insets already handled
  (`env(safe-area-inset-*)`). Main = `max-w-6xl`, padding scales `md:`.
- **Nav:** `AdminLayout.tsx` `NAV` = 18 destinations, flat list.
- **PWA:** `vite-plugin-pwa` configured, **installable** — `display: standalone`,
  `orientation: portrait`, `start_url: /app`, maskable icon, autoUpdate SW.
  No manifest `shortcuts`/`share_target`; offline = static-asset cache only.
- **Capture:** `AudioRecorder.tsx` (`onRecording(blob, secs)`) used in `NewIdea`.
- **Primitives:** shadcn `Sheet` supports `side="bottom"` (bottom sheets ready),
  `Tabs`, `Dialog`, `Button`, etc. Tokens: `--ll-*` in `index.css`.
- **Gaps:** no bottom tab bar, no FAB/quick-create, dense tables
  (`VideosList` is a real `<table>`), no enforced 44px touch targets, no offline UI.

## Design

### 1. Mobile chrome: bottom tab bar + center Capturar FAB
A fixed bottom bar (mobile-only, `md:hidden`), in the thumb zone, with **4 tabs +
a raised center quick-create button**:

```
[ Inicio ]  [ Publicar ]   (＋ Capturar)   [ Crear ]  [ Studio ]
```
- Tabs → `/app/admin` (dashboard glance), `/app/admin/publishing` (or
  `/calendar`), `/app/admin/crear`, `/app/admin/studio`.
- Center **＋ Capturar** (raised, accent) → opens the Quick-Capture bottom sheet
  (the hero, per "capturar al vuelo").
- Active state from `NavLink`. Header keeps the **notification bell** + a
  hamburger that still opens the **full 18-item menu** (`MobileNav`) for
  everything else.
- Respect `env(safe-area-inset-bottom)`; main content gets bottom padding so the
  bar never covers content.

### 2. Quick-Capture sheet (the hero)
A `Sheet side="bottom"` opened by the FAB, reachable from any screen:
- **Default tab — Idea rápida:** big `AudioRecorder` (reuse) + a text field; a
  length chip (Corto default) + optional formato; one primary **"Generar"** →
  uploads audio (`uploadAudio`) / passes text → `generateScript` → navigates to
  the resulting script. Minimal taps, large targets.
- **Secondary chips in the sheet:** "Desde referente" → `/app/admin/crear`,
  "Video largo" → Studio new-project. So all four one-tap features are ≤2 taps.
- Opens fast, autofocuses, remembers the last length/format.

### 3. Mobile-first layouts for the priority flows
Make the four one-tap destinations phone-native (they already use some `sm:`):
- **Dashboard (Inicio):** a glanceable stack of KPI cards + "hoy" (today's
  scheduled posts) + a prominent Capturar button. Single column.
- **Publicaciones/Calendario:** card list by day (today first) instead of a wide
  month grid on small screens; status pills; tap → detail. Schedule CTA sticky.
- **Crear:** the ingredient picker + mode selector already stack; ensure the
  generate CTA is a **sticky bottom action bar** on mobile.
- **Studio:** project list as cards; the section editor uses full-width cards
  (already), with a sticky "Guardar"/"Generar clon" action bar per card.

### 4. Tables → cards + touch ergonomics
- Convert desktop-dense tables to **card lists under `md`** (start with
  `VideosList`; pattern: `hidden md:block` table + `md:hidden` card list, or a
  shared `ResponsiveList`). Apply to other tables as they surface.
- **Touch targets ≥44px**: a `.tap-target` utility / `min-h-11` on interactive
  controls; bigger hit areas on icon buttons.
- **Sticky bottom action bars** on editor screens (script editor, project editor,
  new scheduled post) so the primary action is always in the thumb zone, above
  the tab bar, with safe-area padding.
- Bottom-safe scroll padding on long lists.

### 5. PWA polish (input-first)
- **Manifest `shortcuts`** (long-press the installed icon): "Capturar idea",
  "Crear desde referente", "YouTube Studio" → deep links.
- **`share_target`**: accept shared text/links (and audio if supported) straight
  into Quick-Capture — share a competitor link or a voice memo into the app.
- **Install prompt**: a dismissible "Instalá la app" banner (like `PushPrompt`)
  using `beforeinstallprompt`; iOS gets an "Agregar a inicio" hint.
- **Offline shell**: a friendly offline fallback route (the app already caches the
  shell); queue a failed capture for retry (nice-to-have).

## Implementation phases & files

**Phase 1 — chrome (highest impact):**
- New `src/components/app/BottomTabBar.tsx` (mobile-only) + `CaptureFab` +
  `QuickCaptureSheet.tsx` (reuses `AudioRecorder`, `uploadAudio`,
  `generateScript`). Render from `DashboardShell.tsx` (role-aware items; admin set
  above). Add bottom padding to `main`. Keep `MobileNav` hamburger for the full menu.

**Phase 2 — capture flow:** make the sheet the fastest path; mirror/trim
`NewIdea.tsx` for one-screen record→generate; persist last length/format.

**Phase 3 — priority-flow mobile layouts:** Dashboard glance, Publicaciones day-
cards, sticky action bars on Crear/Studio/script editor.

**Phase 4 — tables→cards + ergonomics:** `ResponsiveList` pattern starting with
`VideosList`; 44px targets utility in `index.css`; sticky action bars.

**Phase 5 — PWA polish:** manifest `shortcuts` + `share_target` in
`vite.config.ts`; install-prompt banner; offline fallback.

## Reuse (don't reinvent)
- `Sheet side="bottom"` for the quick-capture + any mobile pickers.
- `AudioRecorder`, `uploadAudio`, `generateScript` for capture.
- `--ll-*` tokens, `NavLink` active styling, existing safe-area pattern.
- `PushPrompt` as the template for the install banner.

## Verification
- Real-device + responsive-devtools pass on iOS Safari + Android Chrome
  (375–430px): bottom bar reachable, no content hidden behind it, safe-area OK.
- Capture flow: ≤3 taps from anywhere to a generated script.
- Lighthouse PWA (installable, shortcuts present); `npm run build` + eslint clean.
- Regression: desktop ≥ md unchanged (bottom bar/FAB hidden, sidebar intact).

## Open questions / out of scope
- Bottom-bar slot order (Inicio/Publicar/Crear/Studio) — easy to tweak.
- Editor screens (script/section editors) for *full* mobile editing are
  lower priority given "capturar al vuelo"; covered enough by sticky action bars.
- Gestures (swipe between tabs) — deferred.
