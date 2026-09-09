import { useCallback, useState } from 'react'

const ID_KEY = 'freerooms:voter'
const VOTES_KEY = 'freerooms:votes'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

/**
 * A random id kept in the browser, sent with every vote so a second vote on the
 * same room replaces the first. It is not a login and does not pretend to be.
 * Clear your storage and you get a new one, which is the honest limit of voting
 * without accounts.
 */
export function voterId(): string {
  try {
    const existing = localStorage.getItem(ID_KEY)
    if (existing) return existing
    const fresh = crypto.randomUUID()
    localStorage.setItem(ID_KEY, fresh)
    return fresh
  } catch {
    // Private browsing. The vote still counts, it just cannot be revised later.
    return crypto.randomUUID()
  }
}

type MyVotes = Record<string, string>

const slot = (room: string, attribute: string) => `${room}:${attribute}`

/** What this browser has already said, so the dialog can show it back straight away. */
export function useMyVotes() {
  const [votes, setVotes] = useState<MyVotes>(() => read<MyVotes>(VOTES_KEY, {}))

  const remember = useCallback((room: string, attribute: string, value: string) => {
    setVotes((prev) => {
      const next = { ...prev, [slot(room, attribute)]: value }
      try {
        localStorage.setItem(VOTES_KEY, JSON.stringify(next))
      } catch {
        // Session-only is fine.
      }
      return next
    })
  }, [])

  /** Drops the local record too, so the row goes back to looking unanswered. */
  const forget = useCallback((room: string, attribute: string) => {
    setVotes((prev) => {
      const next = { ...prev }
      delete next[slot(room, attribute)]
      try {
        localStorage.setItem(VOTES_KEY, JSON.stringify(next))
      } catch {
        // Session-only is fine.
      }
      return next
    })
  }, [])

  const myVote = useCallback(
    (room: string, attribute: string) => votes[slot(room, attribute)] ?? null,
    [votes],
  )

  return { myVote, remember, forget }
}
