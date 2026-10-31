import { hmToMinutes } from '../utils/time.js'

/** REFRESH_TARGETS as minutes since IST midnight, sorted, malformed entries dropped. */
export function refreshTargets() {
  return (process.env.REFRESH_TARGETS ?? '')
    .split(',')
    .map(hmToMinutes)
    .filter((m) => !Number.isNaN(m))
    .sort((a, b) => a - b)
}

/** Minutes after a target that a tick still counts. Defaults to the cron interval. */
export function refreshGrace() {
  const raw = Number(process.env.REFRESH_GRACE_MIN)
  return Number.isFinite(raw) && raw >= 0 ? raw : 5
}

/**
 * Time a scrape can still be landing after the last tick of a window. A full
 * pass takes about 40 seconds, and cron-job.org can fire a minute or two late.
 */
const SCRAPE_MIN = 5

const DAY_SEC = 24 * 60 * 60
const IST_OFFSET_MS = 330 * 60_000

/**
 * How long the edge may hold `/api/rooms`, in seconds. Zero means do not cache.
 *
 * Room data only changes when a scrape lands, and scrapes only start inside a
 * target's window, from the target to `grace + SCRAPE_MIN` minutes after it.
 * Inside a window nothing is cached, so the new data shows the moment it is
 * written. Outside one, the response is good until the next window opens, or
 * until IST midnight, when `getToday` switches to the next day's sessions.
 */
export function roomsCacheSeconds(now = new Date()) {
  const nowSec = Math.floor(((now.getTime() + IST_OFFSET_MS) % (DAY_SEC * 1000)) / 1000)
  const grace = refreshGrace()

  let until = DAY_SEC
  for (const target of refreshTargets()) {
    const start = target * 60
    const end = (target + grace + SCRAPE_MIN) * 60
    if (nowSec >= start && nowSec < end) return 0
    if (start > nowSec) {
      until = start
      break
    }
  }
  return until - nowSec
}
