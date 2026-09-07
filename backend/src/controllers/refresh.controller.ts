import type { Request, Response } from 'express'
import { waitUntil } from '@vercel/functions'
import { pool } from '../config/db.js'
import { refreshAll } from '../services/refresh.service.js'
import { hmToMinutes, istHm } from '../utils/time.js'

export function runRefresh(req: Request, res: Response) {
  const offset = Math.max(0, Number(req.query.offset) || 0)
  const limit = Math.min(1000, Math.max(1, Number(req.query.limit) || 1000))

  // A full pass takes about 40 seconds and cron-job.org hangs up at 30, so
  // acknowledge straight away and let the platform keep the function alive.
  // The outcome lands in refresh_runs, not in this response.
  const job = refreshAll(offset, limit).catch((err) => {
    console.log('Error in runRefresh:', err)
  })

  try {
    waitUntil(job)
  } catch {
    // Not on Vercel. The local process stays up on its own.
  }

  res.status(202).json({ started: true, offset, limit })
}

// One cron calls this every five minutes. It scrapes when the current IST time
// is at or up to REFRESH_GRACE_MIN minutes past one of REFRESH_TARGETS, never
// before. So a target of 08:00 fires on a tick at 08:00 through 08:05, not
// 07:59. Target times live in env so the schedule changes without a deploy.
//
// The default grace matches the cron interval. A narrower window than the
// interval lets a target fall between two ticks and lose the slot for the day.
export async function runTick(_req: Request, res: Response) {
  const targets = (process.env.REFRESH_TARGETS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const graceRaw = Number(process.env.REFRESH_GRACE_MIN)
  const grace = Number.isFinite(graceRaw) && graceRaw >= 0 ? graceRaw : 5

  const ist = istHm()
  const nowMin = hmToMinutes(ist)

  const matched = targets.find((t) => {
    const delta = nowMin - hmToMinutes(t)
    return delta >= 0 && delta <= grace
  })

  if (!matched) {
    return res.json({ ok: true, ist, triggered: false })
  }

  // The grace window means several ticks match the same target. The first runs
  // the scrape and writes refresh_runs; the rest see that row and stop, so the
  // scrape fires once per slot. The lookback covers the whole window plus slack.
  const since = new Date(Date.now() - (grace + 1) * 60_000)
  const recent = await pool.query('select 1 from refresh_runs where ran_at > $1 limit 1', [since])
  if (recent.rowCount) {
    return res.json({ ok: true, ist, matched, triggered: false, reason: 'ran recently' })
  }

  const job = refreshAll().catch((err) => {
    console.log('Error in runTick:', err)
  })

  try {
    waitUntil(job)
  } catch {
    // Not on Vercel.
  }

  res.status(202).json({ ok: true, ist, matched, triggered: true })
}
