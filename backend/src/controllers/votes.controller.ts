import type { Request, Response } from 'express'
import { ATTRIBUTES, isValidVote } from '../config/attributes.js'
import { castVote, clearVote } from '../services/votes.service.js'

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

/** Same shape as postVote, minus the value: you are removing whatever you said. */
export async function deleteVote(req: Request, res: Response) {
  const room = String(req.params.room ?? '')
  const attribute = String(req.params.attribute ?? '')
  const voterId = req.get('x-voter-id')

  if (typeof voterId !== 'string' || voterId.length < 8 || voterId.length > 64) {
    return res.status(400).json({ error: 'bad voter id' })
  }
  if (!Object.hasOwn(ATTRIBUTES, attribute)) {
    return res.status(400).json({ error: 'unknown attribute' })
  }

  try {
    const result = await clearVote({ room, attribute, voterId })

    if (result === 'unknown-room') return res.status(404).json({ error: 'no such room' })

    res.json({ ok: true })
  } catch (err) {
    console.log('Error in deleteVote:', err)
    res.status(500).json({ error: 'unavailable' })
  }
}
