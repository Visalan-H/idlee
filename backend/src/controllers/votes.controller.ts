import type { Request, Response } from 'express'
import { isValidVote } from '../config/attributes.js'
import { castVote } from '../services/votes.service.js'

export async function postVote(req: Request, res: Response) {
  const room = String(req.params.room ?? '')
  const { attribute, value } = req.body ?? {}
  const voterId = req.get('x-voter-id')

  if (typeof voterId !== 'string' || voterId.length < 8 || voterId.length > 64) {
    return res.status(400).json({ error: 'bad voter id' })
  }
  if (typeof attribute !== 'string' || typeof value !== 'string' || !isValidVote(attribute, value)) {
    return res.status(400).json({ error: 'unknown attribute or value' })
  }

  try {
    const result = await castVote({ room, attribute, value, voterId })

    if (result === 'unknown-room') return res.status(404).json({ error: 'no such room' })

    res.json({ ok: true })
  } catch (err) {
    console.log('Error in postVote:', err)
    res.status(500).json({ error: 'unavailable' })
  }
}
