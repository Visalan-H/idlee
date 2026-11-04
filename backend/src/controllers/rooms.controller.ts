import type { Request, Response } from 'express'
import { roomsCacheSeconds } from '../config/schedule.js'
import { getPlan, getToday, isPlannableDay } from '../services/rooms.service.js'
import { istToday } from '../utils/time.js'

// Held at the edge until the next scrape can land, and never served stale.
// The browser always asks again, so a reopened tab gets what the edge has.
function setRoomsCache(res: Response) {
  const ttl = roomsCacheSeconds()
  res.set('Cache-Control', ttl > 0 ? `public, max-age=0, s-maxage=${ttl}` : 'no-store')
}

export async function getRooms(_req: Request, res: Response) {
  try {
    const data = await getToday()
    setRoomsCache(res)
    res.json(data)
  } catch (err) {
    console.log('Error in getRooms:', err)
    res.status(500).json({ error: 'unavailable' })
  }
}

/** GET /api/rooms/plan?day=YYYY-MM-DD, today when day is left out. */
export async function getRoomsPlan(req: Request, res: Response) {
  const day = typeof req.query.day === 'string' ? req.query.day : istToday()
  if (!isPlannableDay(day)) return res.status(400).json({ error: 'day out of range' })

  try {
    const data = await getPlan(day)
    setRoomsCache(res)
    res.json(data)
  } catch (err) {
    console.log('Error in getRoomsPlan:', err)
    res.status(500).json({ error: 'unavailable' })
  }
}
