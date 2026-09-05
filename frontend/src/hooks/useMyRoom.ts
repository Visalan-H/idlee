import { useCallback, useState } from 'react'

const KEY = 'freerooms:near'

function read(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

/** The room the student says they're near, remembered across visits. */
export function useMyRoom() {
  const [room, setRoomState] = useState<string | null>(read)

  const setRoom = useCallback((value: string | null) => {
    setRoomState(value)
    try {
      if (value) localStorage.setItem(KEY, value)
      else localStorage.removeItem(KEY)
    } catch {
      // localStorage unavailable, private browsing for example. Session-only state still works.
    }
  }, [])

  return [room, setRoom] as const
}
