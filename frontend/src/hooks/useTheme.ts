import { useCallback, useLayoutEffect, useState } from 'react'
import { flushSync } from 'react-dom'

const KEY = 'freerooms:theme'
type Theme = 'light' | 'dark'

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

/** Follows the OS setting live until the user picks one explicitly, then remembers that choice. */
export function useTheme() {
  const [stored, setStored] = useState<Theme | null>(readStored)
  const [system, setSystem] = useState<Theme>(systemTheme)

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
      if (!document.startViewTransition || !origin || reduceMotion) {
        apply()
        return
      }

      // The reveal radius/origin drive a plain CSS @keyframes animation (styles.css), not the
      // Web Animations API - animating a pseudo-element via element.animate() has much spottier
      // browser support and silently no-ops on some engines, which just plays the browser's
      // default cross-fade instead (looks like the reveal "starts from a random place").
      const root = document.documentElement.style
      root.setProperty('--theme-reveal-x', `${origin.x}px`)
      root.setProperty('--theme-reveal-y', `${origin.y}px`)
      root.setProperty(
        '--theme-reveal-r',
        `${Math.hypot(
          Math.max(origin.x, window.innerWidth - origin.x),
          Math.max(origin.y, window.innerHeight - origin.y),
        )}px`,
      )

      document
        .startViewTransition(() => flushSync(apply))
        .ready.catch(() => {
          // Superseded by another transition (e.g. rapid double-click) - the state change already applied.
        })
    },
    [theme],
  )

  return [theme, toggle] as const
}
