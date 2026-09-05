# Free Rooms

Find a classroom that is actually free, without walking the corridor and trying
door handles.

- App: https://idlee.vercel.app
- API: https://idlee-api.vercel.app

## The problem

You have an hour between classes. Somewhere on campus there is an empty room
with a whiteboard and a plug socket. Finding it means climbing to the third
floor, peering through six door windows, and settling for whichever one looks
quiet. By the time you sit down you have lost fifteen minutes.

The timetable already knows the answer. It just does not tell anyone.

## What the app does

Open it and you get one room at the top, in large type, with how far away it is
and how long it stays free. That is the whole product. Everything else is there
for when the top answer does not suit you.

Tell it which room you are in and the ranking changes to match. `3654` means
floor 3, row 6, column 5, so the app knows that `3652` is two doors down and
`2654` is one floor below. It sorts by real walking distance, then by whichever
room holds out longest before the next class claims it.

Free now shows what you can walk into. All rooms shows the day for every room,
free or not. Search understands floors, so typing `3` gives you the third floor
rather than every room with a 3 buried in it.

Tap any room for its full day, class by class, with the current one marked.

## What it will not tell you

Who is teaching, which class it is beyond the course name, or how many students
are in it. That information sits on the same page the app reads and the parser
walks straight past it. The app answers one question. Is this room free.

Coverage is 100 rooms out of roughly 290. The rest are invisible to it, and an
unmapped room looks the same as one with no classes. Scan a door QR with
`qr-scanner/index.html` to add one.

Schedules are read six times a day, not live. A class that gets moved at 11:05
shows up at noon. The header tells you when the data last landed, and a banner
appears if a refresh went missing.

## Running it

```bash
cd backend  && npm install && cp .env.example .env   # fill in DATABASE_URL
npm run dev                                          # :3001

cd frontend && npm install && cp .env.example .env
npm run dev                                          # :5173
```

`FRONTEND_URL` in `backend/.env` has to match the port Vite actually picks. If
another project is holding 5173, Vite moves up and CORS starts rejecting you.

First run against an empty database:

```bash
cd backend
npm run schema                      # create the tables
npm run seed                        # load rooms from ../all_room_data.csv
npm run refresh                     # fetch today's schedule once
```

## Layout

```
backend/                         express, deployed to idlee-api.vercel.app
├── src/index.ts                 app, routes, exported for Vercel
├── src/services/                scraper, refresh, rooms
├── src/routes/ controllers/ middleware/
└── vercel.json                  pins the region to bom1

frontend/                        vite + react, deployed to idlee.vercel.app
├── src/api.ts                   the only file that knows the API exists
├── src/status.ts                free / soon / busy, computed in the browser
├── src/room.ts                  decodes a room number into floor, row, column
├── src/rank.ts                  distance first, then how long it stays free
└── src/components/ hooks/

qr-scanner/                      standalone page for scanning door QR codes
```

Deploys run on push to `main`. Each project builds only when its own directory
changed.

[ARCHITECTURE.md](ARCHITECTURE.md) covers why it is built this way, including
the college portal's limits and what happens when you push it too hard.
