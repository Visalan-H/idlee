import { distance } from './room'
import { statusOf } from './status'
import type { Room, Status } from './types'

export interface Ranked {
  room: Room
  status: Status
  distance: number | null
}

const usableNow = (kind: Status['kind']) => kind === 'free' || kind === 'soon'

export function rankRooms(rooms: Room[], now: Date, from: string | null): Ranked[] {
  return rooms.map((room) => ({
    room,
    status: statusOf(room, now),
    distance: from ? distance(from, room.room) : null,
  }))
}

/** Free/soon rooms ordered by what actually helps: closest first, then longest before it's claimed. */
export function nearYouList(ranked: Ranked[]): Ranked[] {
  return ranked
    .filter((r) => usableNow(r.status.kind))
    .sort((a, b) => {
      const da = a.distance ?? Number.MAX_SAFE_INTEGER
      const db = b.distance ?? Number.MAX_SAFE_INTEGER
      if (da !== db) return da - db

      const ma = a.status.minutesUntilBusy ?? Number.MAX_SAFE_INTEGER
      const mb = b.status.minutesUntilBusy ?? Number.MAX_SAFE_INTEGER
      if (ma !== mb) return mb - ma

      return a.room.room.localeCompare(b.room.room)
    })
}

/** When nothing is free, the closest consolation: which room frees up soonest. */
export function soonestToFree(ranked: Ranked[]): Ranked | null {
  const busy = ranked.filter(
    (r): r is Ranked & { status: Status & { minutesUntilFree: number } } =>
      r.status.kind === 'busy' && r.status.minutesUntilFree != null,
  )
  if (!busy.length) return null

  return busy.sort((a, b) => a.status.minutesUntilFree - b.status.minutesUntilFree)[0]
}
