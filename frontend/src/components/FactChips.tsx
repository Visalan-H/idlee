import { factChips } from '../facts'
import type { FactChip } from '../facts'
import type { Facts } from '../types'

/**
 * The two-column grid is too narrow for every chip. It drops AC, since signal
 * matters more, and an open door, since that is what everyone assumes. A locked
 * door is a warning and always shows. The room sheet still lists everything.
 */
const fitsCompact = (chip: FactChip) =>
  chip.key !== 'ac' && !(chip.key === 'door' && !chip.warn)

/** Read-only consensus, for places too tight for the voting buttons. */
export function FactChips({ facts, compact }: { facts: Facts | undefined; compact?: boolean }) {
  const chips = factChips(facts).filter((chip) => !compact || fitsCompact(chip))
  if (!chips.length) return null

  return (
    <div className="fact-chips">
      {chips.map((chip) => (
        <span key={chip.key} className="fact-chip" data-warn={chip.warn || undefined}>
          {chip.text}
        </span>
      ))}
    </div>
  )
}
