# Architecture and decisions

Why this app is shaped the way it is. Each section states the constraint first,
because most of these decisions are forced rather than chosen.

```
cron-job.org  â”€â”€POST /api/refreshâ”€â”€>  backend  â”€â”€fetchâ”€â”€>  learner.saveetha.in
                                         â”‚
                                         â–¼
                                     Postgres
                                         â–²
 frontend  â”€â”€GET /api/roomsâ”€â”€>  backend â”€â”˜
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

### One cron, a handful of scrapes a day

The scrape should only run at slot boundaries, six or so times a day. Polling
every fifteen minutes was the first instinct and it is wasteful: the timetable
moves a handful of times a day, and six runs at 100 rooms is 600 requests, a
rounding error next to what students themselves generate.

A cron per boundary would work but puts the schedule in the cron-job.org
dashboard, out of the repo. Instead there is one cron every five minutes and
`POST /api/refresh/tick` decides whether now is a boundary. `REFRESH_TARGETS`
holds the IST times as `HH:mm`; changing them is an env edit, not a deploy.
Weekdays stay in the cron expression.

The tick reads the clock in IST, since Vercel runs UTC and India has no DST so
the offset is a fixed +5:30. It fires when now is at a target or up to
`REFRESH_GRACE_MIN` minutes past it, never before, so a scrape never runs
against a slot that has not started. The grace window means several ticks match
one target; the first writes `refresh_runs` and the rest see that row and stop,
so the scrape fires once. Keep the window at least as wide as the cron interval
or a slot can fall between two ticks and be missed.

The cost is honesty about staleness. A class moved at 11:05 is wrong until the
next boundary. The UI carries the last refresh time and a banner appears when a
run goes missing, rather than pretending the data is live.

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

`rooms` holds the number, location id, token and `fetched_at`. `sessions` holds
one row per class. `refresh_runs` holds one row per cron run. `room_votes` holds
what students say about a room.

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

`POST /api/refresh` and `POST /api/refresh/tick` both require `x-refresh-secret`,
compared with `timingSafeEqual`. There is no `?secret=` fallback on purpose.
Query strings show up in request logs, and cron-job.org displays the full URL of
every run in its dashboard.

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

## Crowd facts

### The scrape cannot see the room

A timetable says when a room is booked. It does not say whether the AC works,
whether there is anywhere to plug a laptop in, whether the phone has signal, or
whether the door is ever actually open. Those decide whether a free room is
usable, and they only exist in the memory of people who have walked in.

So there is a fourth table. `room_votes` holds one row per person per attribute
per room, unique on `(room_id, attribute, voter)`, and a second vote updates the
first rather than stacking on it.

### Attributes are data, not columns

`ATTRIBUTES` in `config/attributes.ts` maps a key to its allowed values, and the
table stores both as text. Adding "projector works" is an entry in that object
and a matching entry in the frontend's copy. No migration, no column, no
deploy ordering to think about.

The cost is that the two lists can drift. The backend rejects any pair it does
not recognise, so drift shows up as a 400 rather than a bad row.

### Three votes and sixty percent, or nothing

One vote is one person's Tuesday. A 50/50 split is not a fact. A value displays
only once an attribute has three votes and a clear majority, and otherwise the
room shows nothing rather than a guess.

Votes expire after 90 days. A room gets a new lock, an AC unit dies, and the
tally follows within a term instead of carrying 2024 forever.

### Voting without accounts

The browser generates a random id, keeps it in localStorage, and sends it as
`x-voter-id`. That is the whole identity system. Clearing storage earns a new
vote, and this is a known and accepted limit; the alternative is a login, which
would cost more users than ballot stuffing ever will.

The id is salted and hashed before it reaches Postgres, so the table cannot be
read as a per-device history of which rooms someone has been in, which is the
same reasoning that keeps instructor names out of the parser.

### No rate limiting, and no IP in the database

An earlier version capped votes per IP per day. Two problems. The campus sits
behind one NAT, so every student shares an address and the cap would have locked
out the whole college partway through a day, which is a far larger failure than
the one it was guarding against. And storing an IP at all, hashed or not,
reintroduces exactly the identifier the voter hash was designed to avoid.

The realistic load is a few dozen people who care enough to tap a button. What
protects the data is the display rule, three votes and sixty percent, plus the
90 day expiry. Stuffing a ballot requires sustained effort for no payoff, and if
it ever happens the rows carry `created_at` and can be deleted by time window.

Fingerprinting was considered and rejected for the same reason. Entropy
collapses across a few thousand students on similar phones and the same browser
build, so it would merge real people and silently discard honest votes, while
adding a consent obligation and a tracking library to defend a vote about air
conditioning. If real enforcement is ever needed, the door QR token already
proves someone stood at that room, which is a better qualification than identity.

### A vote takes ten minutes to show up for everyone else

Tallies ride along in `GET /api/rooms`, which sits behind `s-maxage=600`. Giving
votes their own uncached endpoint would mean a second request per room and a
cache-busting one at that, to deliver counts that change a handful of times a
week.

So the voter sees their own choice immediately, from localStorage, and everyone
else sees it at the next edge revalidation. The count next to an option can
therefore lag the button state by a few minutes. That is the intended trade, not
a bug to fix.

## Serving

### Status is computed in the browser

The API returns raw sessions. Free, soon and busy are derived on the client
against a clock that ticks every 30 seconds.

Computing status server side would make every response valid for exactly one
minute and kill caching. This way the payload is the same for everyone, the edge
can hold it, and labels stay correct as time passes without a refetch.

### Edge caching over a database round trip

`GET /api/rooms` sets `s-maxage=600, stale-while-revalidate=1800`. The data
changes a handful of times a day, so ten minutes of edge cache costs nothing in
accuracy and means traffic spikes never reach Neon.

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

### Ranking is one number, and that number is steps

Every free room gets a `cost`, and the lowest wins. Cost is walking distance
plus what the room's settled votes are worth, both in grid steps, where a floor
is 12. Ties break on whichever room stays free longest, then on room number so
the order is stable.

Votes belong in the ranking rather than beside it. A room that is free and
locked is not a room you can use, and printing "usually locked" under a room the
app has just put at the top is telling the student to do the sorting themselves.

`door: locked` costs 40, more than three floors. Everything else is small on
purpose: air conditioning is worth 2 steps, charging ports 3 or 4. Each SIM
network is half a step when it works and one when it is dead, so a room with all
four carriers out costs 4, the same as no charging ports, and a single working
carrier barely registers. A perfect room saves 9 steps, which is less than one
floor, so the ranking never sends anyone upstairs past a free room for the sake
of a plug socket.

### The scale is signed, because penalties alone reward silence

The first version only ever added cost, so a good vote was worth nothing and a
bad one hurt. That quietly promotes every room nobody has been in, which is
exactly backwards when 190 of 290 rooms are unmapped: saying nothing about a
room would have made it look ideal.

So a room with no votes sits at zero, in the middle, and settled votes move it
either way. `open`, `ac`, `many`, `strong` are negative. Their opposites are
positive.

The one place the scale stays lopsided is the door. `locked` is +40 while `open`
is only -2, because a door being open is what you already assumed and a locked
one throws the whole answer away.

### Weights live in one table

`COST` in `facts.ts` is the whole ranking policy, four lines of numbers next to
the comment explaining what a step is worth. Anyone retuning this is editing
data, not logic, and the numbers can be argued about without reading `rank.ts`.

### An unplaceable room sorts last, not first

Rooms outside the numbering scheme have no distance, so they take a cost of 999,
which beats the worst real room by a wide margin. The earlier code used
`MAX_SAFE_INTEGER` at sort time; folding it into the cost means votes still
order those rooms among themselves.

### The consolation pick skips locked rooms

When nothing is free, the app names the room that frees up soonest. It now
prefers one nobody calls locked, and falls back to the locked one only when
every candidate is locked. Waiting twenty minutes for a door that does not open
is the worst answer the app could give.

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
same GitHub repo. They serve `idlee-api.visalan.me` and `idlee.visalan.me`. They
are separate origins, which is why the backend needs CORS and why `FRONTEND_URL`
exists.

The domains are in three places that must agree: `FRONTEND_URL` on the API project,
`VITE_API_URL` on the frontend project, and the absolute `og:` and `twitter:` URLs in
`index.html`. The meta tags are the ones that fail quietly, since a stale image URL
still renders a card, just the wrong one.

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
