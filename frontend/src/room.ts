export interface RoomLocation {
  floor: number
  row: number
  col: number
  index: number
}

const ROOM_RE = /^(\d)(\d)(\d)(\d)$/

// Each floor's 9x9 grid spans at most 16 steps corner to corner, so 12
// guarantees any cross-floor pair outranks any same-floor pair.
const FLOOR_PENALTY = 12

export function parseRoom(room: string): RoomLocation | null {
  const m = room.trim().match(ROOM_RE)
  if (!m) return null

  return { floor: +m[1], row: +m[2], col: +m[3], index: +m[4] }
}

export function getRoomFloor(room: string): string {
  const at = parseRoom(room)
  if (!at) return 'Other'
  return at.floor === 0 ? 'Ground floor' : `Floor ${at.floor}`
}

export function locationLabel(room: string) {
  const at = parseRoom(room)
  if (!at) return null

  const floor = at.floor === 0 ? 'Ground floor' : `Floor ${at.floor}`
  return `${floor} · Row ${at.row} · Column ${at.col}`
}

export function distance(from: string, to: string) {
  const a = parseRoom(from)
  const b = parseRoom(to)
  if (!a || !b) return null

  return (
    Math.abs(a.floor - b.floor) * FLOOR_PENALTY +
    Math.abs(a.row - b.row) +
    Math.abs(a.col - b.col)
  )
}

/** Plain-language proximity. Null if either room is outside the grid scheme. */
export function distanceLabel(from: string, to: string) {
  const a = parseRoom(from)
  const b = parseRoom(to)
  if (!a || !b) return null

  if (a.floor !== b.floor) {
    const floors = Math.abs(a.floor - b.floor)
    return floors === 1 ? '1 floor away' : `${floors} floors away`
  }

  const steps = Math.abs(a.row - b.row) + Math.abs(a.col - b.col)
  if (steps === 0) return 'Right here'
  return steps <= 2 ? 'A few steps away' : `${steps} rooms across this floor`
}

/**
 * Lower is a better match, null means no match at all.
 * A bare "3" should mean floor 3, not every room with a 3 buried in it.
 */
export function searchScore(room: string, query: string): number | null {
  const q = query.trim().toLowerCase()
  if (!q) return 0

  const no = room.toLowerCase()
  if (no === q) return 0
  if (no.startsWith(q)) return 1

  const floor = getRoomFloor(room).toLowerCase()
  if (floor === `floor ${q}` || floor.includes(q)) return 2

  return no.includes(q) ? 3 : null
}
