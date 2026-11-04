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

/**
 * What a one-line row has room for: warnings, signal, and AC when a room has it.
 * "No AC" and port counts are what most rooms look like, so they stay in the sheet.
 */
const rowPriority = (chip: FactChip) =>
  chip.warn ? 0 : chip.key === 'carrier' ? 1 : chip.key === 'ac' && chip.text === 'AC' ? 2 : null

interface Props {
  facts: Facts | undefined
  compact?: boolean
  /** Show at most this many of the row-worthy chips, the most useful first. */
  limit?: number
}

/** Read-only consensus, for places too tight for the voting buttons. */
export function FactChips({ facts, compact, limit }: Props) {
  let chips = factChips(facts).filter((chip) => !compact || fitsCompact(chip))
  if (limit !== undefined) {
    chips = chips
      .filter((chip) => rowPriority(chip) !== null)
      .sort((a, b) => rowPriority(a)! - rowPriority(b)!)
      .slice(0, limit)
  }
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
