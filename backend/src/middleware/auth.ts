import { timingSafeEqual } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'

export function protect(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.REFRESH_SECRET
  const supplied = req.get('x-refresh-secret')

  if (!secret || !supplied) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const a = Buffer.from(supplied)
  const b = Buffer.from(secret)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  next()
}
