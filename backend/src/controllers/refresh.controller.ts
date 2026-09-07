import type { Request, Response } from 'express'
import { waitUntil } from '@vercel/functions'
import { pool } from '../config/db.js'
import { refreshAll } from '../services/refresh.service.js'
import { istHm } from '../utils/time.js'

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

// One cron calls this every minute. It scrapes only when the current IST time
// matches one of REFRESH_TARGETS. Target times live in env so the schedule
// changes without a deploy.
export async function runTick(_req: Request, res: Response) {
  const targets = (process.env.REFRESH_TARGETS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const ist = istHm()

  if (!targets.includes(ist)) {
    return res.json({ ok: true, ist, triggered: false })
  }

  // A minute-interval cron lands one tick in the target minute. If it ever
  // double-taps, this stops the second one spending the scrape again.
  const recent = await pool.query(
    "select 1 from refresh_runs where ran_at > now() - interval '3 minutes' limit 1",
  )
  if (recent.rowCount) {
    return res.json({ ok: true, ist, triggered: false, reason: 'ran recently' })
  }

  const job = refreshAll().catch((err) => {
    console.log('Error in runTick:', err)
  })

  try {
    waitUntil(job)
  } catch {
    // Not on Vercel.
  }

  res.status(202).json({ ok: true, ist, triggered: true })
}
