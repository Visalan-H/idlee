import type { Room, Status } from './types'

export const IST = 'Asia/Kolkata'

/** A free window shorter than this many minutes counts as "closing soon", not plain "free". */
const URGENT_MINUTES = 12

export const fmtTime = (d: Date) =>
  new Intl.DateTimeFormat('en-IN', {
    timeZone: IST,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d)

export const fmtClock = (d: Date) =>
  new Intl.DateTimeFormat('en-IN', {
    timeZone: IST,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d)

export function relative(from: string, now: Date) {
  const mins = Math.round((now.getTime() - new Date(from).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`

  const hours = Math.floor(mins / 60)
  return hours === 1 ? 'an hour ago' : `${hours} hours ago`
}

export function statusOf(room: Room, now: Date): Status {
  if (!room.fresh) return { kind: 'unknown', label: 'no data' }
  if (!room.sessions.length) return { kind: 'free', label: 'free all day' }

  const current = room.sessions.find(
    (s) => new Date(s.startsAt) <= now && now < new Date(s.endsAt),
  )
  if (current) {
    const end = new Date(current.endsAt)
    const minutesUntilFree = Math.max(1, Math.round((end.getTime() - now.getTime()) / 60000))
    return { kind: 'busy', label: `busy until ${fmtTime(end)}`, minutesUntilFree }
  }

  const next = room.sessions
    .map((s) => new Date(s.startsAt))
    .filter((d) => d > now)
    .sort((a, b) => a.getTime() - b.getTime())[0]

  if (!next) return { kind: 'free', label: 'free rest of day' }

  const minutesUntilBusy = Math.round((next.getTime() - now.getTime()) / 60000)
  return minutesUntilBusy <= URGENT_MINUTES
    ? { kind: 'soon', label: `only ${minutesUntilBusy}m left`, minutesUntilBusy }
    : { kind: 'free', label: `free until ${fmtTime(next)}`, minutesUntilBusy }
}
