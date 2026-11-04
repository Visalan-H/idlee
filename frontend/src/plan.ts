import { distance, parseRoom } from './room'
import { factCost, isLocked } from './facts'
import { IST, fmtTime } from './status'
import type { Ranked } from './rank'
import type { Room } from './types'

export interface Slot {
  /** IST wall clock, "HH:mm". */
  start: string
  end: string
}

/**
 * The college's class slots, taken from the portal's own CLS labels. Every
 * session the scraper has seen starts on one of these.
 */
export const SLOTS: Slot[] = [
  { start: '08:00', end: '09:30' },
  { start: '09:45', end: '11:15' },
  { start: '11:30', end: '12:15' },
  { start: '12:15', end: '13:00' },
  { start: '13:15', end: '14:45' },
  { start: '15:00', end: '16:30' },
]

/** Days the plan page offers, today included. Matches PLAN_DAYS on the backend. */
export const PLAN_DAYS = 7

/** An IST date and wall clock time as a real instant. */
export const at = (day: string, hm: string) => new Date(`${day}T${hm}:00+05:30`)

/** The IST date `days` after the one `now` falls on, as YYYY-MM-DD. */
export function istDay(now: Date, days = 0) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: IST }).format(now)
  const [y, m, d] = today.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days, 12)).toISOString().slice(0, 10)
}

export function dayLabel(day: string, now: Date) {
  if (day === istDay(now)) return 'Today'
  if (day === istDay(now, 1)) return 'Tomorrow'
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST,
    weekday: 'short',
    day: 'numeric',
  }).format(at(day, '12:00'))
}

/** The day as it reads mid-sentence: "today", "tomorrow", "on Fri 6". */
export function dayPhrase(day: string, now: Date) {
  const label = dayLabel(day, now)
  return label === 'Today' || label === 'Tomorrow' ? label.toLowerCase() : `on ${label}`
}

export const slotLabel = (day: string, slot: Slot) =>
  `${fmtTime(at(day, slot.start))} – ${fmtTime(at(day, slot.end))}`

export type SlotState = 'free' | 'busy' | 'unknown'

export interface SlotCheck {
  state: SlotState
  label: string
}

/**
 * Whether a room is free for the whole of a slot.
 *
 * A booking that overlaps the slot makes it busy, and that holds whatever else
 * is uncertain. Otherwise the room is free only if its schedule is known past
 * the slot's end. A room whose last scrape hit the portal's four-card cap before
 * then, or whose scrapes have been failing, is unknown, never free.
 */
export function checkSlot(room: Room, day: string, slot: Slot): SlotCheck {
  const start = at(day, slot.start)
  const end = at(day, slot.end)
  const sessions = room.sessions.map((s) => ({ start: new Date(s.startsAt), end: new Date(s.endsAt) }))

  const clash = sessions.find((s) => s.start < end && s.end > start)
  if (clash) return { state: 'busy', label: `booked until ${fmtTime(clash.end)}` }

  if (!room.fresh) return { state: 'unknown', label: 'no recent data' }

  const knownUntil = room.knownUntil ? new Date(room.knownUntil) : null
  if (knownUntil && knownUntil < end) {
    return { state: 'unknown', label: `schedule known until ${fmtTime(knownUntil)}` }
  }

  const next = sessions
    .map((s) => s.start)
    .filter((d) => d >= end)
    .sort((a, b) => a.getTime() - b.getTime())[0]
  if (next) return { state: 'free', label: `free until ${fmtTime(next)}` }

  const dayEnd = at(day, '23:59')
  if (knownUntil && knownUntil < dayEnd) {
    return { state: 'free', label: `free until at least ${fmtTime(knownUntil)}` }
  }
  return { state: 'free', label: 'free rest of day' }
}

export interface PlanRow extends Ranked {
  check: SlotCheck
}

const UNPLACED = 999

/**
 * Rooms for one slot, split by what is known. Free rooms follow the same rules
 * as the home list: the student's floor order first, a room people call locked
 * at the end of its floor, then walking distance plus votes.
 */
export function planRooms(rooms: Room[], day: string, slot: Slot, from: string | null, floors: number[]) {
  const rows: PlanRow[] = rooms.map((room) => {
    const check = checkSlot(room, day, slot)
    const steps = from ? distance(from, room.room) : null
    return {
      room,
      check,
      distance: steps,
      cost: (from ? (steps ?? UNPLACED) : 0) + factCost(room.facts),
      // RoomRow reads status for its dot and label.
      status: { kind: check.state, label: check.label },
    }
  })

  const tier = (r: PlanRow) => {
    const i = floors.indexOf(parseRoom(r.room.room)?.floor ?? -1)
    return i === -1 ? floors.length : i
  }
  const locked = (r: PlanRow) => (isLocked(r.room.facts) ? 1 : 0)

  const order = (a: PlanRow, b: PlanRow) =>
    tier(a) - tier(b) ||
    locked(a) - locked(b) ||
    a.cost - b.cost ||
    a.room.room.localeCompare(b.room.room)

  return {
    free: rows.filter((r) => r.check.state === 'free').sort(order),
    unknown: rows.filter((r) => r.check.state === 'unknown').sort(order),
    busy: rows.filter((r) => r.check.state === 'busy').length,
  }
}
