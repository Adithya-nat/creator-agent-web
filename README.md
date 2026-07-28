# Storyboard Agent — Frontend

A modern, login-free web UI for the **storyboard_agent** backend (a companion project,
published as a separate repo). Describe a story, watch it generate live (each pipeline stage with expandable logs),
then play and download the finished vertical short. Built with **Next.js (App Router) +
React Three Fiber** for a cinematic, motion-forward feel.

## Surfaces

- `/` — Create. A three.js hero, a prompt bar, a 30s/60s toggle, and Generate.
- `/status/[jobId]` — Live status **and** result on one URL. While running: a 3D
  progress visualization plus a CI-style stage list (`script_writer → designer →
  image_gen → motion → assembler`, when enabled) where each stage expands to its
  live logs. When done: the video player, a frame-by-frame storyboard, and a download.
  Job ID + a 1-hour expiry
  countdown are always shown; the URL is shareable and survives a refresh.
- `/retrieve` — Paste a saved job ID to reopen it, plus a list of recent jobs kept in
  this browser (no account needed).

## Requirements

- Node 18+ (built/tested on Node 24)
- The `storyboard_agent` backend running and reachable

## Setup

```bash
cp .env.example .env.local
# set NEXT_PUBLIC_API_BASE to your backend (default http://localhost:8000)

npm install
npm run dev          # http://localhost:3000
```

Run the backend in mock mode (no API keys, deterministic placeholder frames) for a
full local end-to-end. From a checkout of the `storyboard_agent` repo:

```bash
docker compose up -d && alembic upgrade head
uvicorn app.main:app --reload    # serves on :8000
```

> The backend must allow this origin via CORS. It defaults to `http://localhost:3000`;
> set `CORS_ORIGINS` on the backend for any other origin (see its `.env.example`).

## Environment

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_API_BASE` | Backend base URL, no trailing slash. Default `http://localhost:8000`. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key. Blank → widget hidden (the backend also skips verification unless `TURNSTILE_ENABLED=true`). |

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run start      # serve the build
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
```

## Deploy (Vercel)

1. Import the repo; framework auto-detects as Next.js.
2. Set env vars: `NEXT_PUBLIC_API_BASE` = your deployed backend URL, and
   `NEXT_PUBLIC_TURNSTILE_SITE_KEY` if using Turnstile.
3. On the **backend**, add the Vercel domain to `CORS_ORIGINS`, and (for production)
   set `TURNSTILE_ENABLED=true` + `TURNSTILE_SECRET_KEY`, and keep `RATE_LIMIT_ENABLED=true`.

The backend is a stateful Python service (Postgres + ffmpeg), so host it on a
container/VM platform (Render, Fly, Railway, a VM), not on Vercel.

## Performance & accessibility

- The three.js bundle is code-split (`dynamic(..., { ssr: false })`), so the initial
  JS stays lean. Canvases cap device pixel ratio and fall back to a CSS gradient when
  WebGL is unavailable.
- `prefers-reduced-motion` swaps 3D animation for a static frame, disables parallax,
  and neutralizes CSS transitions.
- Keyboard-navigable, ARIA accordion semantics on stages, `aria-live` status updates,
  and AA-contrast cinematic palette.

## How it talks to the backend

- `lib/api.ts` — typed client; `lib/types.ts` mirrors the FastAPI schemas.
- `hooks/useJobStream.ts` — subscribes to `GET /storyboard/{id}/events` (SSE) with a
  `Last-Event-ID` cursor, and **falls back to polling** `GET /{id}` + `/logs?after=`
  if SSE is unavailable (e.g. `ENABLE_LOG_STREAMING=false` or a buffering proxy).
- Result media is fetched via `GET /storyboard/{id}/storyboard` (frames + captions)
  and streamed through `GET /storyboard/{id}/artifacts/{artifactId}` and `/video`.
- New backends may include optional motion coverage and per-scene renderer/model
  metadata. The result view summarizes generative versus fallback coverage and the
  filmstrip shows small renderer/fallback badges. Old backend payloads render
  exactly as before, including hover playback.
