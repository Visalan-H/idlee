import { pool } from '../config/db.js'
import { scrapeRoom } from './scraper.service.js'

const CONCURRENCY = 6
const BUDGET_MS = 45_000

interface RoomRow {
  id: number
  room_no: string
  location_id: number
  token: string
}

// The page prints its own room in an <h1>, e.g. "3653" or "0453-...Lab". A row
// passes only when that heading starts with the room_no we hold for it.
function labelMatches(label: string, roomNo: string) {
  if (!label.startsWith(roomNo)) return false
  const rest = label.slice(roomNo.length)
  return rest === '' || /^[^A-Za-z0-9]/.test(rest)
}

async function refreshRoom(room: RoomRow, now: Date) {
  const { label, sessions } = await scrapeRoom(room.location_id, room.token)

  // If the page names a different room, this row's token points elsewhere and
  // writing its sessions here would file another room's timetable under this
  // one. Skip instead of corrupting. A missing label (markup changed) can't be
  // checked, so it passes through rather than blocking every refresh.
  if (label && !labelMatches(label, room.room_no)) {
    throw new Error(`identity mismatch: page shows "${label}", expected ${room.room_no}`)
  }

  const upcoming = sessions.filter((s) => new Date(s.startsAt) > now)
  const client = await pool.connect()

  try {
    await client.query('begin')
    await client.query('delete from sessions where room_id = $1 and starts_at > $2', [room.id, now])

    for (const s of upcoming) {
      await client.query(
        `insert into sessions (room_id, day, starts_at, ends_at, course)
         values ($1, $2, $3, $4, $5)
         on conflict (room_id, starts_at) do update
           set ends_at = excluded.ends_at, course = excluded.course`,
        [room.id, s.day, s.startsAt, s.endsAt, s.course],
      )
    }

    await client.query('update rooms set fetched_at = now() where id = $1', [room.id])
    await client.query('commit')
  } catch (err) {
    await client.query('rollback')
    throw err
  } finally {
    client.release()
  }
}

export async function refreshAll(offset = 0, limit = 1000) {
  const started = Date.now()
  const { rows: rooms } = await pool.query<RoomRow>(
    `select id, room_no, location_id, token
       from rooms
      where active
      order by room_no
      offset $1 limit $2`,
    [offset, limit],
  )

  const now = new Date()
  let cursor = 0
  let ok = 0
  let failed = 0

  async function worker() {
    while (cursor < rooms.length && Date.now() - started < BUDGET_MS) {
      const room = rooms[cursor++]
      try {
        await refreshRoom(room, now)
        ok++
      } catch (err) {
        failed++
        console.log(`Refresh failed for room ${room.room_no}:`, err)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, rooms.length) }, worker))

  const ms = Date.now() - started
  const attempted = ok + failed
  const done = attempted >= rooms.length

  // ran_at is when the run started, so it lands on the cron's own schedule
  // instead of a minute later once every room has been fetched.
  await pool.query('insert into refresh_runs (ran_at, ok, failed, ms) values ($1, $2, $3, $4)', [
    new Date(started),
    ok,
    failed,
    ms,
  ])

  return { ok, failed, rooms: rooms.length, ms, done, nextOffset: done ? null : offset + attempted }
}
