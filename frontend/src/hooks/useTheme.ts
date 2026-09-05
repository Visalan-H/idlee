import { useCallback, useLayoutEffect, useRef, useState } from 'react'

const KEY = 'freerooms:theme'
type Theme = 'light' | 'dark'

export interface ThemeReveal {
  x: number
  y: number
  radius: number
  /** The outgoing theme's page background, frozen so the overlay can wipe away from it. */
  color: string
}

function readStored(): Theme | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Follows the OS setting live until the user picks one explicitly, then remembers that choice.
 *
 * The circular reveal is a real fixed-position div with clip-path (see ThemeRevealOverlay),
 * not the View Transitions API. Animating a pseudo-element (::view-transition-new(root)) via
 * the Web Animations API turned out to render inconsistently across engines/DPR/scrollbar
 * states - the coordinates going in were always correct, but the rendered position wasn't. A
 * plain DOM element with clip-path has no such snapshot ambiguity.
 */
export function useTheme() {
  const [stored, setStored] = useState<Theme | null>(readStored)
  const [system, setSystem] = useState<Theme>(systemTheme)
  const [reveal, setReveal] = useState<ThemeReveal | null>(null)
  const switching = useRef(false)

  useLayoutEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystem(mq.matches ? 'dark' : 'light')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const theme = stored ?? system

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggle = useCallback(
    (origin?: { x: number; y: number }) => {
      if (switching.current) return

      const next: Theme = theme === 'dark' ? 'light' : 'dark'
      const apply = () => {
        setStored(next)
        try {
          localStorage.setItem(KEY, next)
        } catch {
          // localStorage unavailable, private browsing for example. Session-only state still works.
        }
      }

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (!origin || reduceMotion) {
        apply()
        return
      }

      switching.current = true
      const oldColor = getComputedStyle(document.documentElement).getPropertyValue('--cream').trim()
      const radius = Math.hypot(
        Math.max(origin.x, window.innerWidth - origin.x),
        Math.max(origin.y, window.innerHeight - origin.y),
      )

      apply()
      setReveal({ x: origin.x, y: origin.y, radius, color: oldColor })
    },
    [theme],
  )

  const clearReveal = useCallback(() => {
    setReveal(null)
    switching.current = false
  }, [])

  return { theme, toggle, reveal, clearReveal }
}
