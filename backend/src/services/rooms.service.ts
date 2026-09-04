import { pool } from '../config/db.js'
import { istToday } from '../utils/time.js'

interface Row {
  room_no: string
  fresh: boolean
  fetched_at: Date | null
  starts_at: Date | null
  ends_at: Date | null
  course: string | null
}

interface RoomDay {
  room: string
  fresh: boolean
  fetchedAt: string | null
  sessions: { startsAt: string; endsAt: string; course: string | null }[]
}

export async function getToday() {
  const day = istToday()

  const { rows } = await pool.query<Row>(
    `select r.room_no,
            r.fetched_at > now() - interval '20 hours' as fresh,
            r.fetched_at,
            s.starts_at, s.ends_at, s.course
       from rooms r
       left join sessions s on s.room_id = r.id and s.day = $1
      where r.active
      order by r.room_no, s.starts_at`,
    [day],
  )

  const byRoom = new Map<string, RoomDay>()

  for (const row of rows) {
    let entry = byRoom.get(row.room_no)
    if (!entry) {
      entry = {
        room: row.room_no,
        fresh: row.fresh === true,
        fetchedAt: row.fetched_at?.toISOString() ?? null,
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

  const roomList = [...byRoom.values()]
  const stamps = roomList.map((r) => r.fetchedAt).filter((t): t is string => t !== null)

  return {
    day,
    updatedAt: stamps.length ? stamps.reduce((a, b) => (a > b ? a : b)) : null,
    staleRooms: roomList.filter((r) => !r.fresh).length,
    rooms: roomList,
  }
}
