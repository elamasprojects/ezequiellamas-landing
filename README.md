# ezequiellamas.com

Personal brand hub for Ezequiel Lamas. Vite + React + TypeScript SPA, deployed on Vercel, backed by Supabase.

## Areas

- `/` — landing
- `/app` — authenticated app (Supabase auth)
- `/recursos` — public, DB-backed resource library
- `/eventos/*` — static slide decks

## Setup

```bash
npm install
cp .env.example .env.local
# fill in VITE_SUPABASE_PUBLISHABLE_KEY (from the Supabase dashboard)
npm run dev
```

Dev server runs on `http://localhost:8080`.

## Deploy (Vercel)

1. Connect this repo to a Vercel project.
2. Add the two env vars from `.env.example` in Project Settings → Environment Variables.
3. Point `ezequiellamas.com` (and `www.ezequiellamas.com`) at the Vercel deployment.

`vercel.json` handles SPA rewrites and excludes `/eventos/*` so the legacy static HTML decks keep working.

## Supabase

Project: **Personal Brand Hub** (ref `zsbligbfsmdwbxcvoysu`). See [`CLAUDE.md`](./CLAUDE.md) for MCP routing rules and CLI commands.

```bash
npx supabase link --project-ref zsbligbfsmdwbxcvoysu
npx supabase migration new <name>
npx supabase db push
```

## Repo layout

```
src/
├─ main.tsx          Vite entry, BrowserRouter, QueryClient, Sonner, Vercel analytics
├─ App.tsx           <Routes>: /, /login, /auth/callback, /recursos*, /app*
├─ index.css         Tailwind + shadcn HSL tokens + landing styles (scoped to body.landing)
├─ pages/            Landing, Login, AuthCallback, NotFound, app/*, recursos/*
├─ components/
│  ├─ landing/       Nav, Hero, Filosofia, Historia, Recorrido, Logros, Vision, Marquee, Footer
│  └─ ui/            shadcn primitives (copied from ugc-studio-hub on demand)
├─ lib/              supabase, queryClient, utils
└─ hooks/            useSession, useFadeIn

public/
└─ eventos/hackitba/index.html    legacy slide deck

supabase/
├─ config.toml       (after `npx supabase init`)
└─ migrations/
```

## Notes

- TypeScript config is loose (`strict: false`) to match the sister project (`ugc-studio-hub`) and keep component copy-paste friction low.
- Landing styles are CSS-only (not Tailwind) and scoped under `body.landing` to avoid bleeding into `/app` or `/recursos`. shadcn primitives are reserved for those areas.
