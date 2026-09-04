# Free Rooms

Shows which classrooms are free right now.

- Frontend: https://idlee.vercel.app
- API: https://idlee-api.vercel.app

```
cron-job.org  ──POST /api/refresh──>  backend  ──fetch──>  learner.saveetha.in
                                         │
                                         ▼
                                     Postgres
                                         ▲
 frontend  ──GET /api/rooms──>  backend ─┘
```

Visitors never trigger a fetch to the college portal. Load there is fixed at one
request per room per refresh, whether one person uses the site or five hundred.

## Layout

```
backend/
├── .env.example
└── src/
    ├── index.ts                 express app, routes, listen
    ├── config/db.ts             pg pool
    ├── config/schema.sql
    ├── routes/                  rooms.routes.ts, refresh.routes.ts
    ├── controllers/             rooms.controller.ts, refresh.controller.ts
    ├── middleware/auth.ts       checks x-refresh-secret
    ├── services/                scraper, refresh, rooms
    └── utils/time.ts            IST date

frontend/                        Vite + React
├── .env.example
└── src/
    ├── App.tsx
    ├── api.ts                   the only file that knows the API URL
    ├── status.ts                free / soon / busy, computed in the browser
    ├── components/
    └── hooks/

qr-scanner/                      standalone page for scanning door QR codes
```

## Why it's built this way

- The portal serves HTML with no CORS headers, so the browser can't read it directly.
- Each response is capped at 4 session cards, which is one teaching day. A
  `?scope=future` fetch before the first slot returns the whole day. Later runs
  replace only sessions that haven't started, so the morning's capture survives.
- Room URLs embed a per-room token. They live in the `rooms` table, never in the
  repo and never in a response.
- Instructor names, staff IDs and participant counts are on the page but are not
  parsed or stored. The board only answers "is it free".
- Vercel deploys Express with zero config because the entry is `src/index.ts` and
  it exports the app. No `api/` directory, no `vercel.json`.

## Local

```bash
cd backend  && npm install && cp .env.example .env   # fill in DATABASE_URL
npm run dev                                          # :3001

cd frontend && npm install && cp .env.example .env
npm run dev                                          # :5173
```

## Setup from scratch

```bash
cd backend
npm run schema                      # create the tables
npm run seed                        # load rooms from ../all_room_data.csv
npm run refresh                     # fetch today's schedule once
```

## Deploys

Two Vercel projects from the same repo, each with its own root directory:

| Project | Root directory | Env vars |
| --- | --- | --- |
| `idlee-api` | `backend` | `DATABASE_URL`, `REFRESH_SECRET`, `FRONTEND_URL` |
| `idlee` | `frontend` | `VITE_API_URL` |

`FRONTEND_URL` is what CORS allows. `VITE_API_URL` is baked into the frontend
bundle at build time, so changing it needs a redeploy.

## The cron

One job on cron-job.org: `POST https://idlee-api.vercel.app/api/refresh`
with header `x-refresh-secret`. There's no query-parameter fallback, so the
secret never lands in their request logs.

Schedule, IST: **07:00, 09:00, 11:00, 12:00, 13:00, 14:00**, Mon–Sat — each one
lands before a slot boundary. 600 requests a day, never more than 6 at once.

100 rooms take about 17s. The function budget is 45s; past roughly 250 rooms a
call stops early and returns `{"done": false, "nextOffset": N}`, which is the
signal to add a second job at `?offset=N`.

Don't raise `CONCURRENCY`. Pushing the portal harder got 503s back.

## Adding rooms

Scan the QR on the door with `qr-scanner/index.html`, append the URL to the CSV,
re-run `npm run seed`. No redeploy — the refresh job reads the room list from the
database at runtime.
