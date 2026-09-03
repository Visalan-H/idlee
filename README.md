# Free Rooms

Shows which classrooms are free right now.

```
cron-job.org  ──POST /api/refresh──>  Vercel  ──fetch──>  learner.saveetha.in
                                         │
                                         ▼
                                     Postgres
                                         ▲
  Browser  ──GET /api/rooms──>  Vercel ──┘   (edge-cached, s-maxage=600)
```

Visitors never trigger a fetch to the college portal. Load there is fixed at roughly
one request per room per refresh, regardless of how many people use the site.

## Why it's built this way

- The portal serves HTML with no CORS headers, so the browser can't read it directly.
- Each response is capped at **4 session cards**, which is exactly one teaching day.
  A `?scope=future` fetch made before the 08:00 slot returns the whole day at once.
  Later runs only replace sessions that haven't started yet, so the morning's capture
  of the full day survives until midnight.
- Room URLs embed a per-room capability token. They live in the `rooms` table and
  are never committed or sent to the browser.
- Instructor names, staff IDs and participant counts are visible on the page but are
  deliberately not parsed or stored. The board only answers "is it free".

## Setup

1. **Database** — create a Postgres (Neon, Supabase, whatever) and apply the schema:

   ```bash
   psql "$DATABASE_URL" -f scripts/schema.sql
   ```

2. **Load rooms** from the CSV of scanned QR codes:

   ```bash
   DATABASE_URL=... npm run seed -- all_room_data.csv
   ```

   Re-run it after scanning more rooms; existing entries are updated, not duplicated.

3. **Vercel** — deploy the repo and set two env vars:

   | Var | Value |
   | --- | --- |
   | `DATABASE_URL` | Postgres connection string, ending `?sslmode=verify-full` |
   | `REFRESH_SECRET` | any long random string |

4. **cron-job.org** — one job, `POST https://<your-app>.vercel.app/api/refresh`, with a
   custom header `x-refresh-secret: <your secret>`. The secret must be a header; there
   is no query-parameter fallback, because that would leave it in their request logs.

   Schedule, IST: **05:30, 08:30, 11:30, 14:30**, Mon–Sat.

   100 rooms take under 10s (one request each, 6 at a time). The function budget is 45s,
   so a call only stops early well past 500 rooms; when it does it returns
   `{"done": false, "nextOffset": N}` — the signal to add a second cron job at `?offset=N`.

   Don't raise `CONCURRENCY`. Pushing the portal harder got 503s back.

## Local

```bash
npm install
DATABASE_URL=... npm run refresh:local
DATABASE_URL=... npm run dev
```

## Adding rooms

Scan the QR on the door with `qr-scanner/index.html`, append the URL to the CSV, re-run
`npm run seed`. No redeploy — the refresh job reads the room list from the database.
