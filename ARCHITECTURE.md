# Architecture and decisions

Why this app is shaped the way it is. Each section states the constraint first,
because most of these decisions are forced rather than chosen.

```
cron-job.org  ──POST /api/refresh──>  backend  ──fetch──>  learner.saveetha.in
                                         │
                                         ▼
                                     Postgres
                                         ▲
 frontend  ──GET /api/rooms──>  backend ─┘
```

## The source and its three limits

Every room has a page on `learner.saveetha.in` at a URL carrying a per-room
capability token, the kind printed on the QR code stuck to the door. Three
properties of that page decide most of the design.

It sends no CORS headers, so a browser cannot read it. It caps every response at
four session cards, which is one teaching day. And it starts returning 503 when
you ask for more than roughly six pages at once.

The first limit alone rules out a pure frontend. Something server side has to
fetch, store, and serve.

### Scrape on a schedule, not on demand

An obvious build would fetch a room's page when someone opens the app. That
means the college server's load scales with how popular the app gets, which is
the wrong thing to be exposed to. One class group sharing the link during a
break would look like an attack.

Instead a cron hits the backend, the backend fetches every room once, and the
result goes to Postgres. Load on the portal is one request per room per refresh
whether one person uses the app or five hundred. That number is knowable in
advance and does not change.

### Six refreshes a day, aligned to slot boundaries

Slots start at 7:30, 8:00, 9:45, 11:15, 11:30, 12:15, 13:15 and 15:00. The cron
runs at 07:00, 09:00, 11:00, 12:00, 13:00 and 14:00 IST, Monday to Saturday,
each one landing just before a boundary so a room's state is fresh at the moment
it changes.

Polling every fifteen minutes was the first instinct and it is wasteful. The
timetable moves a handful of times a day. Six runs at 100 rooms is 600 requests
daily, which is a rounding error next to what students themselves generate.

The cost is honesty about staleness. A class moved at 11:05 is wrong until noon.
The UI carries the last refresh time and a banner appears when a run goes
missing, rather than pretending the data is live.

### Deleting only the future

The four-card cap means a single fetch never returns a whole day once the day is
underway. A `?scope=future` fetch at 7am returns everything. The same fetch at
1pm returns only what is left.

So a refresh deletes only sessions that have not started yet, then inserts what
it found. The morning's capture survives every later run. `sessions` is unique
on `(room_id, starts_at)`, so a re-fetch of the same class updates rather than
duplicates, and the whole thing runs in one transaction per room.

`?scope=past` exists on the portal and the app never calls it. Doubling the
request count to reconstruct history nobody asked for is not worth it.

### Concurrency of six

Twelve workers with two scopes put 24 requests in flight and the portal answered
with 503s. Dropping to six made the run *faster*, 16.8 seconds instead of
timing out, because nothing had to retry.

This number is empirical. Do not raise it without testing against the real
server, and if you do, watch for 503s rather than wall-clock time.

## Data

### Postgres, not a file or a KV store

The schedule is relational and the queries are joins. More to the point, room
comments are a plausible next feature, and a comments table wants a real
database. Neon's free tier covers this size of data comfortably.

Three tables. `rooms` holds the number, location id, token and `fetched_at`.
`sessions` holds one row per class. `refresh_runs` holds one row per cron run.

### Tokens live in exactly one place

The URL token is a capability. Anyone holding it can read that room's schedule
without logging in. So tokens sit in the `rooms` table and nowhere else, never in
the repo, never in an API response, never in a log line.

That last one was a real bug. `/api/refresh` used to return `String(err)` on
failure, which included the full tokenised URL, which then landed in
cron-job.org's request log. It now logs server side and returns counts only.

### The parser reads two things

Times and course names. The same page carries instructor names, staff ids and
participant counts, and the parser walks past all of it.

This is deliberate. A tool that answers "is this room free" needs nothing about
people, and storing what you do not need turns a scheduling convenience into a
surveillance question you have to defend.

### Timezone is decided at parse time

`+05:30` is appended to the date and time as they come out of the HTML, before
the value reaches Postgres. Everything downstream is a real instant. The
frontend formats with `Intl.DateTimeFormat` and `timeZone: 'Asia/Kolkata'`, so a
phone with the wrong clock timezone still shows the right times.

The alternative, storing naive local times and converting later, means every
consumer has to remember. Someone always forgets.

## The refresh endpoint

### Secret in a header, no query fallback

`POST /api/refresh` requires `x-refresh-secret`, compared with `timingSafeEqual`.
There is no `?secret=` fallback on purpose. Query strings show up in request
logs, and cron-job.org displays the full URL of every run in its dashboard.

### 202 and waitUntil

A full pass takes longer than 30 seconds and cron-job.org hangs up at 30. Every
run was showing as a timeout while the data landed perfectly well, which is the
worst kind of monitoring, an alert that means nothing.

The endpoint now acknowledges in about 30ms and hands the work to `waitUntil`,
which keeps the Vercel function alive after the response. Retries on the cron
side should be off, because a timeout is no longer a signal.

The trade is that the response cannot report what happened. Every run writes to
`refresh_runs` instead, and the app reads the newest row for its "updated" time.
Real failures surface in the UI through `staleRooms` and the stale banner, not
through the cron dashboard.

### ran_at is when the run started

The column used to default to `now()` at insert, which happens after every room
has been fetched. A 3:00 cron therefore recorded 3:01. Since the point of that
timestamp is to answer "when did the schedule last refresh", it records the
start, which lines up with the cron's own schedule.

### Budget and pagination

`refreshAll` stops at 45 seconds and records `done: false` with a `nextOffset`.
At 100 rooms a run takes about 19 seconds from `bom1`, so there is headroom.
Past roughly 250 rooms a run will start truncating, and the fix is a second cron
entry at `?offset=N` rather than a bigger machine.

## Serving

### Status is computed in the browser

The API returns raw sessions. Free, soon and busy are derived on the client
against a clock that ticks every 30 seconds.

Computing status server side would make every response valid for exactly one
minute and kill caching. This way the payload is the same for everyone, the edge
can hold it, and labels stay correct as time passes without a refetch.

### Edge caching over a database round trip

`GET /api/rooms` sets `s-maxage=600, stale-while-revalidate=1800`. The data
changes six times a day, so ten minutes of edge cache costs nothing in accuracy
and means traffic spikes never reach Neon.

### No polling

The app fetches on mount and again on `visibilitychange`. A 60 second timer was
in an earlier version and it is waste, since the data changes every two hours.
Coming back to the tab is the only moment the data can be stale to you, so that
is when it refetches.

## The frontend

### Room numbers are coordinates

`3654` means floor 3, row 6, column 5, room 4. Every floor uses the same 9 by 9
grid, so suffixes repeat and `2371` sits directly below `3371`. This came out of
the building map PDF, not from documentation.

It is the single fact that makes the app worth using. Without it you get an
alphabetical list, which is no better than the timetable. With it you can rank
by walking distance.

`distance` is Manhattan distance on the grid plus 12 steps per floor. A floor
spans at most 16 steps corner to corner, so 12 guarantees any same-floor room
beats any cross-floor room, and the ordering never claims a stairwell trip is
shorter than a walk down the corridor.

Rooms outside the scheme, like `CLS03`, return null from every function in
`room.ts`, and every caller handles null. An unparseable room still appears, it
just cannot be ranked by distance.

### Ranking is distance first, duration second

Closest room wins. Ties break on whichever room stays free longest, then on room
number so the order is stable. When nothing is free at all, the app names the
room that frees up soonest instead of showing an empty list.

### Search scores, it does not filter

Typing `3` on a substring filter returns 2371 before 3654, which is useless.
`searchScore` ranks instead. Exact match, then prefix, then floor label, then
substring anywhere. So `3` means the third floor, and `ground` works too.

### State lives in three places

The chosen room in localStorage, the query and tab in React state, everything
else computed on render. No store, no context, no cache layer. The whole app is
one fetch and a few `useMemo` calls, and adding a state library to it would be
ceremony.

### Hand-written CSS

No Tailwind, no component library. Ten components with a token file at the top
does not justify a build-time dependency, and the design is specific enough that
a component library would mostly get overridden.

## Deployment

### Express, exported, no api directory

Vercel deploys an Express app with no routing config as long as the entry is
`src/index.ts` and it exports the app. `app.listen` is guarded behind
`!process.env.VERCEL` so local dev still works.

An earlier version split the code into serverless handlers under `api/` with the
logic hoisted into shared modules. It was harder to read and harder to run
locally for no benefit. Routes, controllers, services and middleware is a
structure any backend developer can navigate.

Note that `express.static()` does nothing on Vercel, which is part of why the
frontend is a separate project rather than served by the backend.

### Two projects, one repo

`idlee-api` builds from `backend`, `idlee` builds from `frontend`, both from the
same GitHub repo. They are separate origins, which is why the backend needs CORS
and why `FRONTEND_URL` exists.

Each project's ignored build step is `git diff --quiet HEAD^ HEAD .`, run from
its own root directory. Exit 0 means nothing there changed and Vercel skips the
build, so a backend commit does not rebuild the frontend.

One consequence. `vercel --prod` from inside `backend/` fails now, because the
project resolves its root directory against whatever you upload and looks for
`backend/backend`. Deploy by pushing.

### The region matters more than you would think

`vercel.json` pins the backend to `bom1`. Running from a US region turned a 19
second refresh into 45, because every one of those 100 requests crossed an ocean
to reach a server in Chennai. This file was lost once during a restructure and
the slowdown was the only symptom.

## Open

The Neon password has been exposed in plain text and still needs rotating.

190 of about 290 rooms are unmapped. Scanning them is manual work with the QR
scanner page, and until it is done an unknown room is indistinguishable from an
empty one.

End times display a minute early, `11:14` rather than `11:15`, because the
portal stores `11:14:59` and formatting truncates. Rounding up is a one-line
change nobody has decided is worth making.
