import { useCallback, useLayoutEffect, useRef, useState } from 'react'
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
  // A second tap mid-animation would start a new transition on top of the still-clipping old
  // one, stacking two reveals and making the whole thing look laggy and misplaced. Guard against it.
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
      if (!document.startViewTransition || !origin || reduceMotion) {
        apply()
        return
      }

      switching.current = true
      const endRadius = Math.hypot(
        Math.max(origin.x, window.innerWidth - origin.x),
        Math.max(origin.y, window.innerHeight - origin.y),
      )

      const transition = document.startViewTransition(() => flushSync(apply))

      transition.ready
        .then(() => {
          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${origin.x}px ${origin.y}px)`,
                `circle(${endRadius}px at ${origin.x}px ${origin.y}px)`,
              ],
            },
            {
              duration: 500,
              easing: 'ease-in-out',
              pseudoElement: '::view-transition-new(root)',
            },
          )
        })
        .catch(() => {
          // Setup failed or the transition was superseded - the theme change already applied.
        })

      transition.finished.finally(() => {
        switching.current = false
      })
    },
    [theme],
  )

  return [theme, toggle] as const
}
