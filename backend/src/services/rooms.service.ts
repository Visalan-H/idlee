import { pool } from '../config/db.js'
import { istDayOffset, istToday } from '../utils/time.js'
import { getFacts } from './votes.service.js'
import type { Facts } from './votes.service.js'

interface Row {
  room_no: string
  fresh: boolean
  fetched_at: Date | null
  known_until: Date | null
  starts_at: Date | null
  ends_at: Date | null
  course: string | null
}

interface RoomDay {
  room: string
  fresh: boolean
  fetchedAt: string | null
  /** Bookings after this instant were past the portal's cap. Null means none were. */
  knownUntil: string | null
  sessions: { startsAt: string; endsAt: string; course: string | null }[]
  /** Crowd votes, omitted for rooms nobody has voted on. */
  facts?: Facts
}

/** How far ahead the plan page may look, today included. */
export const PLAN_DAYS = 7

async function loadDay(day: string) {
  const [{ rows }, lastRun, facts] = await Promise.all([
    pool.query<Row>(
      `select r.room_no,
              r.fetched_at > now() - interval '20 hours' as fresh,
              r.fetched_at,
              r.known_until,
              s.starts_at, s.ends_at, s.course
         from rooms r
         left join sessions s on s.room_id = r.id and s.day = $1
        where r.active
        order by r.room_no, s.starts_at`,
      [day],
    ),
    pool.query<{ ran_at: Date }>(
      'select ran_at from refresh_runs order by ran_at desc limit 1',
    ),
    getFacts(),
  ])

  const byRoom = new Map<string, RoomDay>()

  for (const row of rows) {
    let entry = byRoom.get(row.room_no)
    if (!entry) {
      entry = {
        room: row.room_no,
        fresh: row.fresh === true,
        fetchedAt: row.fetched_at?.toISOString() ?? null,
        knownUntil: row.known_until?.toISOString() ?? null,
        sessions: [],
      }
      byRoom.set(row.room_no, entry)
    }
    if (row.starts_at && row.ends_at) {
      entry.sessions.push({
        startsAt: row.starts_at.toISOString(),
        endsAt: row.ends_at.toISOString(),
        course: row.course,
      })
    }
  }

  for (const [room, tally] of facts) {
    const entry = byRoom.get(room)
    if (entry) entry.facts = tally
  }

  return {
    // When the cron last ran. Per-room success shows up in staleRooms and fetchedAt.
    updatedAt: lastRun.rows[0]?.ran_at.toISOString() ?? null,
    rooms: [...byRoom.values()],
  }
}

export async function getToday() {
  const day = istToday()
  const { updatedAt, rooms } = await loadDay(day)

  return {
    day,
    updatedAt,
    staleRooms: rooms.filter((r) => !r.fresh).length,
    rooms,
  }
}

/** True for a YYYY-MM-DD from today to PLAN_DAYS - 1 days ahead, in IST. */
export function isPlannableDay(day: string) {
  return Array.from({ length: PLAN_DAYS }, (_, i) => istDayOffset(i)).includes(day)
}

/**
 * Every room's bookings on one day, for choosing a room ahead of time. The
 * payload matches today's, and each room's `knownUntil` says where its schedule
 * stops being certain, since a busy room's later classes can sit past the cap.
 */
export async function getPlan(day: string) {
  const { updatedAt, rooms } = await loadDay(day)
  return { day, updatedAt, rooms }
}
