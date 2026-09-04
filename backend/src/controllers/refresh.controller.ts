import type { Request, Response } from 'express'
import { refreshAll } from '../services/refresh.service.js'

export async function runRefresh(req: Request, res: Response) {
  const offset = Math.max(0, Number(req.query.offset) || 0)
  const limit = Math.min(1000, Math.max(1, Number(req.query.limit) || 1000))

  try {
    res.json(await refreshAll(offset, limit))
  } catch (err) {
    console.log('Error in runRefresh:', err)
    res.status(500).json({ error: 'refresh failed' })
  }
}
