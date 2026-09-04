import type { Request, Response } from 'express'
import { getToday } from '../services/rooms.service.js'

export async function getRooms(_req: Request, res: Response) {
  try {
    const data = await getToday()
    res.set('Cache-Control', 'public, max-age=0, s-maxage=600, stale-while-revalidate=1800')
    res.json(data)
  } catch (err) {
    console.log('Error in getRooms:', err)
    res.status(500).json({ error: 'unavailable' })
  }
}
