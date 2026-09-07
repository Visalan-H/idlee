import { settledFacts } from '../facts'
import type { Facts } from '../types'

/** Read-only consensus, for places too tight for the voting buttons. */
export function FactChips({ facts, limit }: { facts: Facts | undefined; limit?: number }) {
  const settled = settledFacts(facts)
  if (!settled.length) return null

  const shown = limit ? settled.slice(0, limit) : settled

  return (
    <div className="fact-chips">
      {shown.map(({ attribute, option }) => (
        <span key={attribute.key} className="fact-chip" data-warn={option.warn || undefined}>
          {option.short}
        </span>
      ))}
    </div>
  )
}
