import type { Room } from './types'

/** The shortest stay worth walking to a room for. */
export const MIN_STAY = 45

/** Past this the extra hours do not change which room wins, so the plan stops here. */
const MAX_STAY = 150

/** A time counts as a class boundary once this many rooms end a session at it. */
const BOUNDARY_ROOMS = 3

export interface Stay {
  minutes: number
}

/**
 * Guesses how long the student wants a room for, with no question asked. Sessions
 * across the building end together at slot boundaries, so the stay is the time to
 * the first boundary that leaves a worthwhile stay. At 9:30, with the 9:45 slot
 * ending at 11:15, that is 1h 45m. At 11:10 the 11:15 boundary is too close to
 * bother with, so the plan moves on to the slot after it.
 */
export function inferStay(rooms: Room[], now: Date): Stay {
  const ends = new Map<number, number>()
  for (const room of rooms) {
    for (const session of room.sessions) {
      const at = new Date(session.endsAt).getTime()
      ends.set(at, (ends.get(at) ?? 0) + 1)
    }
  }

  const earliest = now.getTime() + MIN_STAY * 60_000
  const boundary = [...ends]
    .filter(([at, count]) => count >= BOUNDARY_ROOMS && at >= earliest)
    .map(([at]) => at)
    .sort((a, b) => a - b)[0]

  if (boundary === undefined) return { minutes: MIN_STAY }

  const minutes = Math.round((boundary - now.getTime()) / 60_000)
  return { minutes: Math.min(minutes, MAX_STAY) }
}
