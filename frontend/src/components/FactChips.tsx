import { factChips } from '../facts'
import type { Facts } from '../types'

/** Read-only consensus, for places too tight for the voting buttons. */
export function FactChips({ facts, limit }: { facts: Facts | undefined; limit?: number }) {
  const chips = factChips(facts)
  if (!chips.length) return null

  const shown = limit ? chips.slice(0, limit) : chips

  return (
    <div className="fact-chips">
      {shown.map((chip) => (
        <span key={chip.key} className="fact-chip" data-warn={chip.warn || undefined}>
          {chip.text}
        </span>
      ))}
    </div>
  )
}
