import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

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

/**
 * Follows the OS setting live until the user picks one explicitly, then remembers that choice.
 *
 * `toggle` crossfades: it drops a fixed overlay painted in the outgoing theme's background over
 * the page, swaps the theme on <html> behind it, then fades the overlay out - so the new theme
 * fades in underneath. opacity is the only animated property, so it stays smooth on phones.
 * `switching` gates the button (data-busy + pointer-events:none) so a second tap can't stack a
 * fade on one still running. Under prefers-reduced-motion the theme just swaps, no fade.
 */
export function useTheme() {
  const [stored, setStored] = useState<Theme | null>(readStored)
  const [system, setSystem] = useState<Theme>(systemTheme)
  const [switching, setSwitching] = useState(false)

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

  // Held so an unmount mid-fade can tear the overlay down instead of leaving it
  // painted over the page forever.
  const veilRef = useRef<HTMLDivElement | null>(null)

  useEffect(
    () => () => {
      veilRef.current?.remove()
      veilRef.current = null
    },
    [],
  )

  const toggle = useCallback(() => {
    if (switching) return

    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    const apply = () => {
      // Straight on <html> so the swap lands this frame, not after a React round-trip; the
      // effect below re-sets the same value on re-render, which is a no-op.
      document.documentElement.setAttribute('data-theme', next)
      setStored(next)
      try {
        localStorage.setItem(KEY, next)
      } catch {
        // localStorage unavailable, private browsing for example. Session-only state still works.
      }
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion || typeof document.body.animate !== 'function') {
      apply()
      return
    }

    setSwitching(true)

    // Overlay in the outgoing theme's background, over everything. Swap the theme behind it, then
    // fade the overlay out - the page underneath is already the new theme, so it fades in.
    const veil = document.createElement('div')
    veil.className = 'theme-veil'
    veil.style.background = getComputedStyle(document.body).backgroundColor
    document.body.appendChild(veil)
    veilRef.current = veil

    apply()

    const done = () => {
      veil.remove()
      if (veilRef.current === veil) veilRef.current = null
      setSwitching(false)
    }
    const fade = veil.animate({ opacity: [1, 0] }, { duration: 260, easing: 'ease-out' })
    fade.finished.then(done).catch(done)
  }, [theme, switching])

  return { theme, toggle, switching }
}
