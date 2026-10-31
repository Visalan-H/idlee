import type { Request, Response } from 'express'
import { roomsCacheSeconds } from '../config/schedule.js'
import { getToday } from '../services/rooms.service.js'

export async function getRooms(_req: Request, res: Response) {
  try {
    const data = await getToday()

    // Held at the edge until the next scrape can land, and never served stale.
    // The browser always asks again, so a reopened tab gets what the edge has.
    const ttl = roomsCacheSeconds()
    res.set('Cache-Control', ttl > 0 ? `public, max-age=0, s-maxage=${ttl}` : 'no-store')
    res.json(data)
  } catch (err) {
    console.log('Error in getRooms:', err)
    res.status(500).json({ error: 'unavailable' })
  }
}
