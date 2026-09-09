# Idlee

Find a classroom that is free right now, at Saveetha. Live at
<https://idlee.visalan.me>.

The college portal already knows which rooms are booked. It just will not tell
you without standing at the door. Idlee reads that data on a schedule and puts
it in one list.

## What it does

Open it and you get the nearest room that is free, with how far away it is and
how long it stays free. Below that is every other free room, then the full day
for every room whether it is free or not.

Tell it which room you are in and the order changes to match. Room numbers work
as coordinates: `3654` is floor 3, row 6, column 5, so `3652` is two doors down
and `2654` is one floor below. Rooms sort by walking distance first, then by
which one holds out longest before its next class.

Tap any room for its full day, class by class, with the current one marked.
Search understands floors, so `3` gives you the third floor rather than every
room with a 3 in the number.

## Room facts

A room being unbooked does not make it usable. The door may be locked, there may
be no plug socket, there may be no signal. The portal does not know any of this,
so the app asks whoever has been inside: door open or locked, AC or not, how
many charging ports, and which of Jio, Airtel, Vi and BSNL get a signal.

Settled facts move the ranking, measured in the same steps as walking. A room
three doors away that people say is locked loses to one at the end of the
corridor. Softer facts count for less, so it will not send you up a floor for
air conditioning when there is a plain empty room on yours.

A fact only shows once three people agree and at least sixty percent said the
same thing. Votes older than three months stop counting, so a room that gets a
new lock catches up on its own.

There are no accounts. Your browser holds a random id so you can change your
answer later, and it is hashed before storage, so the table cannot be read as a
record of which rooms you have been sitting in.

## Limits

- 100 rooms of roughly 290 are mapped. An unmapped room looks the same as one
  with no classes.
- Schedules refresh a handful of times a day at class-slot boundaries, not live.
  A class moved at 11:05 appears at the next boundary. The header shows when the
  data last landed.
- End times display a minute early, `11:14` rather than `11:15`, because the
  portal stores `11:14:59`.
- Teacher, section and headcount are on the same page the scraper reads. It
  walks past them on purpose.

## Why there is a QR scanner in the repo

Each classroom has a QR code by the door that opens that room's timetable. The
link behind it is not `/room/3613`, it is a per-room token, a different random
string for every door, so it cannot be guessed or typed.

`qr-scanner/index.html` is a single page that opens the camera, reads a door QR
and shows the token to copy. Walking a corridor with it is how rooms get added,
and it is why only 100 of them exist so far.

## Running it

Postgres, Node 20+. Backend and frontend are separate packages.

```bash
# backend
cd backend
npm install
cp .env.example .env      # fill in DATABASE_URL, REFRESH_SECRET, VOTE_SALT
npm run schema            # create tables, drop votes for retired attributes
npm run seed              # load rooms and tokens from all_room_data.csv
npm run refresh           # scrape today's schedules once
npm run dev               # :3001 unless PORT says otherwise
```

```bash
# frontend, in another terminal
cd frontend
npm install
cp .env.example .env      # VITE_API_URL, the backend's address
npm run dev
```

The dev server port is pinned in `vite.config.ts` and has to match
`FRONTEND_URL` in the backend's `.env`, which is the backend's entire CORS
allowlist. If they disagree every request is blocked.

`npm run typecheck` in either package. `npm run build` in `frontend`.

## Deployment

React and Vite on the front, Express and Postgres behind it, two Vercel projects
from this one repo. Schedules are refreshed by cron rather than on demand, so
the college portal sees the same handful of requests whether one person uses
this or five hundred.

[ARCHITECTURE.md](ARCHITECTURE.md) covers why it is built this way, including
the portal's limits and what happens when you push it too hard.
