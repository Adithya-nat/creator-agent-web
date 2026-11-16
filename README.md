# Creator Agent: web app

The studio for [Creator Agent](https://github.com/Adithya-nat/creator-agent), an open-source AI
film studio. Write one line, pick a story style (Dialogue, Mixed, Narrated) and a language
(English or Tamil), watch every stage live, then download the film, cover and post copy.

- Homepage: <https://adithya-nat.github.io/creator-agent/>
- Run everything locally: [creator-agent/SETUP.md](https://github.com/Adithya-nat/creator-agent/blob/main/SETUP.md)
- Host it for others: [creator-agent/DEPLOY.md](https://github.com/Adithya-nat/creator-agent/blob/main/DEPLOY.md)

Built with Next.js 16, React 19, Tailwind 4, React Three Fiber 9, Recharts and Better Auth.

## Pages

- `/login`: sign in with GitHub or Google (hosted mode only).
- `/`: create a film. In hosted mode you add your own Gemini key first (top bar, **Add Gemini key**).
- `/status/[jobId]`: the live production line while a film renders, then the player, scenes,
  cast, publish kit and a countdown to the 24-hour deletion.
- `/retrieve`: your films from the last 24 hours (from your account when signed in, from this
  browser otherwise).
- `/usage`: what your films cost, per run and per model.

## Two modes

| | Local (default) | Hosted beta |
| --- | --- | --- |
| `NEXT_PUBLIC_AUTH_ENABLED` | `false` | `true` |
| Sign-in | none | Better Auth (GitHub, Google), sessions in Postgres schema `creator_auth` |
| API calls | plain | `Authorization: Bearer <15-min JWT>`; the API verifies it with this app's `/api/auth/jwks` |
| Gemini key | the API's `.env` | the user's own, kept in this browser and sent only on create/resume |

The user's key is stored in `sessionStorage`, or in `localStorage` when they tick **Remember on
this device** (`lib/geminiKey.ts`). Video, images and the live event stream use a signed `?t=`
link from `GET /me`, because `<video>` and `EventSource` can't send headers (`lib/session.ts`).

## Setup

```bash
cp .env.example .env.local     # NEXT_PUBLIC_API_BASE defaults to http://localhost:8000
npm install
npm run dev                    # http://localhost:3000
```

Hosted mode locally (no OAuth app needed): set `NEXT_PUBLIC_AUTH_ENABLED=true`,
`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=http://localhost:3000` and
`AUTH_EMAIL_PASSWORD=true`, run `npm run auth:migrate` once, and start the API with
`AUTH_MODE=jwt AUTH_JWKS_URL=http://localhost:3000/api/auth/jwks AUTH_ISSUER=http://localhost:3000`.
Then sign up with `POST /api/auth/sign-up/email`.

## Scripts

```bash
npm run dev           # dev server
npm run build         # production build (standalone output, used by the Dockerfile)
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
npm test              # vitest
npm run auth:migrate  # create/upgrade the sign-in tables (needs DATABASE_URL)
```

## Deploy

See [DEPLOY.md](https://github.com/Adithya-nat/creator-agent/blob/main/DEPLOY.md). The
`Dockerfile` here builds the standalone server; `NEXT_PUBLIC_*` values are build arguments.

## How it talks to the API

- `lib/api.ts`: typed client. Adds the sign-in token to every call and the Gemini key to
  create, resume and key-check calls. `lib/types.ts` mirrors the FastAPI schemas.
- `hooks/useJobStream.ts`: subscribes to `GET /storyboard/{id}/events` (SSE) and falls back to
  polling if SSE is unavailable.
- `components/account/`: the account gate (`/me`), the "on the list" screen, the key dialog and
  the account menu.
