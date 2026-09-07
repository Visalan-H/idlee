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

What people have voted on moves the order too, measured in the same steps. A room three doors away that everyone says is locked loses to one at the far end of the corridor, because a door that doesn't open is not a shortcut. The softer things count for less. Air conditioning is worth about two doors, so the app will never send you up a floor chasing a plug socket when there's a plain empty room right here.

Free now shows what you can walk into. All rooms shows the day for every room, free or not. Search understands floors, so typing `3` gives you the third floor instead of every room with a 3 in it, and `ground` works too. Tap a room for its full day, class by class, with the current one marked.

## The things a timetable can't know

A room being unbooked doesn't make it usable. The door might be locked anyway. There might be no AC, no plug socket you can reach, no signal to tether from. The portal knows none of this and never will, because nobody writes it down.

So the room card asks you. Four questions, one tap each. Is the door usually open or usually locked. AC or no AC. Plenty of charging ports, a few, or none. Signal strong, patchy, or dead.

No account, no name attached. Your browser holds a random id so you can change your answer later, and it's hashed before it's stored, so the table can't be read as a record of which rooms you've been sitting in.

A room only shows a fact once three people agree and at least sixty percent of them said the same thing. Below that it stays blank, because one person's Tuesday isn't a fact. Answers older than three months stop counting, so a room that gets a new lock or a dead AC catches up on its own.

## What it won't tell you

Who's teaching, which section it is, or how many students are in there. All of that sits on the same page the app reads, and it walks past it. Storing what you don't need turns a scheduling convenience into a surveillance question you have to defend.

## What it doesn't cover yet

100 rooms out of roughly 290. The rest are invisible to it, and an unmapped room looks the same as one with no classes. Closing that gap is corridor work with the QR scanner page, the same walk that started this.

Schedules are read six times a day, not live. A class moved at 11:05 shows up at noon. The header tells you when the data last landed, and a banner appears if a refresh went missing.

## Under the hood

React and Vite on the front, Express and Postgres behind it, both on Vercel. A cron refreshes the schedules on a fixed rhythm so the college portal sees the same small number of requests whether one person uses this or five hundred.

[ARCHITECTURE.md](ARCHITECTURE.md) has the reasoning, including the portal's limits and what happens when you push it too hard. Setup steps are in there too.
