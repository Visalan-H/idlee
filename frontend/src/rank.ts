import { distance, parseRoom } from './room'
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

/**
 * Under this many minutes a room is not worth walking to, whatever floor it is on.
 * Without it a first-choice floor holding only a 3-minute room would lead the list.
 */
const ALMOST_GONE = 30

/**
 * Free rooms in the order a student should try them.
 *
 * Rooms with under `ALMOST_GONE` minutes left sink below everything else, whatever
 * their floor, longest first.
 *
 * The rest are grouped by the student's floor order. A room people say is usually
 * locked goes to the end of its floor, not the end of the list, because a vote
 * can be wrong and the floor is the student's own choice. The open rooms on each
 * floor fall in three bands, best first:
 * 1. free from now on. A room with no class today and one whose last class is over
 *    look the same to someone walking in, so they share a band.
 * 2. free through the next session (`stay`), but taken later
 * 3. free for less than that, longest first
 * Within the first two bands `cost` decides, which is the walk plus what people
 * said about power, AC and signal. The longest free window breaks a tie.
 */
export function nearYouList(ranked: Ranked[], stay: number, floors: number[]): Ranked[] {
  const minutesLeft = (r: Ranked) => r.status.minutesUntilBusy ?? Number.MAX_SAFE_INTEGER

  const sink = (r: Ranked) => (minutesLeft(r) < ALMOST_GONE ? 1 : 0)
  const locked = (r: Ranked) => (isLocked(r.room.facts) ? 1 : 0)

  const band = (r: Ranked) => {
    if (r.status.minutesUntilBusy === undefined) return 0
    return minutesLeft(r) >= stay ? 1 : 2
  }

  // Unlisted floors sort after every listed one. With no floors chosen all tie.
  const tier = (r: Ranked) => {
    const at = floors.indexOf(parseRoom(r.room.room)?.floor ?? -1)
    return at === -1 ? floors.length : at
  }

  return ranked
    .filter((r) => usableNow(r.status.kind))
    .sort((a, b) => {
      if (sink(a) !== sink(b)) return sink(a) - sink(b)

      // Among rooms that run short, the one that lasts longest is the least bad.
      const short =
        sink(a) === 1 ||
        (tier(a) === tier(b) && locked(a) === locked(b) && band(a) === 2 && band(b) === 2)
      if (short && minutesLeft(a) !== minutesLeft(b)) return minutesLeft(b) - minutesLeft(a)

      if (tier(a) !== tier(b)) return tier(a) - tier(b)
      if (locked(a) !== locked(b)) return locked(a) - locked(b)
      if (band(a) !== band(b)) return band(a) - band(b)

      if (a.cost !== b.cost) return a.cost - b.cost
      if (minutesLeft(a) !== minutesLeft(b)) return minutesLeft(b) - minutesLeft(a)

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
