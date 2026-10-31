import { useCallback, useState } from 'react'

const KEY = 'freerooms:floors'

function read(): number[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((n): n is number => Number.isInteger(n)) : []
  } catch {
    return []
  }
}

/** Floors the student prefers, best first, remembered across visits. */
export function useFloorPriority() {
  const [floors, setFloorsState] = useState<number[]>(read)

  const setFloors = useCallback((next: number[]) => {
    setFloorsState(next)
    try {
      if (next.length) localStorage.setItem(KEY, JSON.stringify(next))
      else localStorage.removeItem(KEY)
    } catch {
      // localStorage unavailable, private browsing for example. Session-only state still works.
    }
  }, [])

  /** Tapping a floor adds it at the end of the order, tapping it again drops it. */
  const toggle = useCallback(
    (floor: number) =>
      setFloors(floors.includes(floor) ? floors.filter((f) => f !== floor) : [...floors, floor]),
    [floors, setFloors],
  )

  const clear = useCallback(() => setFloors([]), [setFloors])

  return { floors, toggle, clear }
}
