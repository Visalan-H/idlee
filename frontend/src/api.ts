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
