import { distance } from './room'
import { factCost, isLocked } from './facts'
import { statusOf } from './status'
import type { Room, Status } from './types'

export interface Ranked {
  room: Room
  status: Status
  distance: number | null
  /** Walking distance plus what the room's settled facts are worth, in grid steps. Lower wins. */
  cost: number
}

/**
 * A room outside the numbering scheme cannot be placed, so it sorts below every
 * room that can be. Larger than the worst real cost, which is roughly 124 steps
 * of walking plus 50 for a room that is locked, unpowered, hot and with every
 * carrier dead.
 */
const UNPLACED = 999

const usableNow = (kind: Status['kind']) => kind === 'free' || kind === 'soon'

export function rankRooms(rooms: Room[], now: Date, from: string | null): Ranked[] {
  return rooms.map((room) => {
    const steps = from ? distance(from, room.room) : null

    // With no room set every walk is equal, so cost is what people said alone.
    const base = from ? (steps ?? UNPLACED) : 0

    return {
      room,
      status: statusOf(room, now),
      distance: steps,
      cost: base + factCost(room.facts),
    }
  })
}

/** Free/soon rooms ordered by what actually helps: cheapest walk first, then longest before it's claimed. */
export function nearYouList(ranked: Ranked[]): Ranked[] {
  return ranked
    .filter((r) => usableNow(r.status.kind))
    .sort((a, b) => {
      if (a.cost !== b.cost) return a.cost - b.cost

      const ma = a.status.minutesUntilBusy ?? Number.MAX_SAFE_INTEGER
      const mb = b.status.minutesUntilBusy ?? Number.MAX_SAFE_INTEGER
      if (ma !== mb) return mb - ma

      return a.room.room.localeCompare(b.room.room)
    })
}

/**
 * When nothing is free, the closest consolation: which room frees up soonest.
 * A room people say is always locked is the last thing to suggest waiting for,
 * so it only wins if every alternative is locked too.
 */
export function soonestToFree(ranked: Ranked[]): Ranked | null {
  const busy = ranked.filter(
    (r): r is Ranked & { status: Status & { minutesUntilFree: number } } =>
      r.status.kind === 'busy' && r.status.minutesUntilFree != null,
  )
  if (!busy.length) return null

  const open = busy.filter((r) => !isLocked(r.room.facts))
  const pool = open.length ? open : busy

  return pool.sort((a, b) => a.status.minutesUntilFree - b.status.minutesUntilFree)[0]
}
