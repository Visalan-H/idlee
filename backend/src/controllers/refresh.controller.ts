import type { Request, Response } from 'express'
import { waitUntil } from '@vercel/functions'
import { refreshAll } from '../services/refresh.service.js'

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
