import { useEffect, useRef } from 'react'
import type { ThemeReveal } from '../hooks/useTheme'

interface Props {
  reveal: ThemeReveal
  onDone: () => void
}

/** A solid-color circle that shrinks away from the toggle to reveal the new theme underneath. */
export function ThemeRevealOverlay({ reveal, onDone }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const animation = el.animate(
      {
        clipPath: [
          `circle(${reveal.radius}px at ${reveal.x}px ${reveal.y}px)`,
          `circle(0px at ${reveal.x}px ${reveal.y}px)`,
        ],
      },
      { duration: 450, easing: 'ease-in-out', fill: 'forwards' },
    )

    animation.finished.then(onDone).catch(onDone)
    return () => animation.cancel()
  }, [reveal, onDone])

  return (
    <div
      ref={ref}
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        background: reveal.color,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    />
  )
}
