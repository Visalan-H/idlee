# Idlee

Find a classroom that's actually free, without walking the corridor and trying door handles.

Try here: https://idlee.vercel.app

## The hour you lose

You have a free hour between classes. Somewhere in the building there's an empty room with a whiteboard and a plug socket. Finding it means going up to the third floor, looking through six door windows, and settling for whichever one looks quiet. Fifteen minutes gone before you sit down.

The timetable already knows the answer. It just doesn't tell anyone.

## It started with the door QR

Every classroom has a small QR code taped next to the door. Scan it and the college portal shows you that room's timetable for the day.

The problem is what's behind the QR. It isn't `/room/3613`. It's a per-room token, a random string, different for every door. You can't type it and you can't guess it. To read room 3613's timetable you have to be standing in front of room 3613 with your camera out, which defeats the point, because the reason you wanted the timetable was to decide whether to walk there.

So the first thing I built wasn't the app. It was `qr-scanner/index.html`, a single page that opens the camera, reads a door QR and puts the token somewhere I can copy it from. Walk a corridor once, scan a row of doors, paste the batch in. That page is still in the repo and it's how new rooms get added.

## What you get

Open it and there's one room at the top, in large type, with how far away it is and how long it stays free. That's the whole product. The rest is for when the top answer doesn't suit you.

Tell it which room you're in and the ranking changes to match. Room numbers are coordinates: `3654` is floor 3, row 6, column 5. So `3652` is two doors down and `2654` is one floor below. It sorts by walking distance first, then by whichever room holds out longest before the next class takes it.

Free now shows what you can walk into. All rooms shows the day for every room, free or not. Search understands floors, so typing `3` gives you the third floor instead of every room with a 3 in it, and `ground` works too. Tap a room for its full day, class by class, with the current one marked.

## What it won't tell you

Who's teaching, which section it is, or how many students are in there. All of that sits on the same page the app reads, and it walks past it. Idlee answers one question. Is this room free.

## What it doesn't cover yet

100 rooms out of roughly 290. The rest are invisible to it, and an unmapped room looks the same as one with no classes. Closing that gap is corridor work with the QR scanner page, the same walk that started this.

Schedules are read six times a day, not live. A class moved at 11:05 shows up at noon. The header tells you when the data last landed, and a banner appears if a refresh went missing.

## Under the hood

React and Vite on the front, Express and Postgres behind it, both on Vercel. A cron refreshes the schedules on a fixed rhythm so the college portal sees the same small number of requests whether one person uses this or five hundred.

[ARCHITECTURE.md](ARCHITECTURE.md) has the reasoning, including the portal's limits and what happens when you push it too hard. Setup steps are in there too.
