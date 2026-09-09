import type { TodayPayload } from './types'

const BASE = import.meta.env.VITE_API_URL ?? ''

export async function fetchToday(): Promise<TodayPayload> {
  let res: Response
  try {
    res = await fetch(`${BASE}/api/rooms`)
  } catch {
    throw new Error('Schedule service is unreachable. Check your connection and try again.')
  }
  if (!res.ok) {
    throw new Error(`Schedule service returned an error (HTTP ${res.status}).`)
  }
  return res.json()
}

export async function castVote(room: string, attribute: string, value: string, voterId: string) {
  const res = await fetch(`${BASE}/api/rooms/${encodeURIComponent(room)}/votes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-voter-id': voterId },
    body: JSON.stringify({ attribute, value }),
  })
  if (!res.ok) throw new Error("Couldn't save that vote.")
}

export async function clearVote(room: string, attribute: string, voterId: string) {
  const res = await fetch(
    `${BASE}/api/rooms/${encodeURIComponent(room)}/votes/${encodeURIComponent(attribute)}`,
    { method: 'DELETE', headers: { 'x-voter-id': voterId } },
  )
  if (!res.ok) throw new Error("Couldn't remove that vote.")
}
