import { useState } from 'react'
import { ChevronRightIcon, PinIcon } from '../icons'
import { FloorPicker } from './FloorPicker'
import { LocationBar } from './LocationBar'

interface Props {
  /** Leave out on pages where where-you-are does not matter, like planning ahead. */
  myRoom?: string | null
  onSetRoom?: (room: string | null) => void
  availableFloors: number[]
  floors: number[]
  onToggleFloor: (floor: number) => void
  onClearFloors: () => void
}

const floorName = (f: number) => (f === 0 ? 'G' : String(f))

/**
 * Your room and floor order, folded into one line. Both are set once and rarely
 * touched, so they stay out of the way until tapped.
 */
export function PrefsBar({
  myRoom,
  onSetRoom,
  availableFloors,
  floors,
  onToggleFloor,
  onClearFloors,
}: Props) {
  const [open, setOpen] = useState(false)

  const parts = [
    myRoom ? `Near ${myRoom}` : null,
    floors.length ? `Floors ${floors.map(floorName).join(', ')}` : null,
  ].filter(Boolean)
  const empty = onSetRoom ? 'Set your room and floors' : 'Prefer some floors?'

  return (
    <div className="prefs" data-open={open || undefined}>
      <button
        type="button"
        className="prefs-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <PinIcon className="loc-icon" width={15} height={15} />
        <span className={parts.length ? 'prefs-summary' : 'prefs-summary muted'}>
          {parts.length ? parts.join(' · ') : empty}
        </span>
        <span className="prefs-cue">
          {open ? 'Done' : 'Change'}
          <ChevronRightIcon className="prefs-chevron" width={13} height={13} />
        </span>
      </button>

      {open && (
        <div className="prefs-panel">
          {onSetRoom && <LocationBar myRoom={myRoom ?? null} onSet={onSetRoom} />}
          <FloorPicker
            available={availableFloors}
            priority={floors}
            onToggle={onToggleFloor}
            onClear={onClearFloors}
          />
        </div>
      )}
    </div>
  )
}
