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

type Panel = 'room' | 'floors'

/**
 * Your room and your floor order, as two small buttons on one line. They are
 * separate settings, each set once and rarely touched, so each opens on its own
 * and stays out of the way otherwise.
 */
export function PrefsBar({
  myRoom,
  onSetRoom,
  availableFloors,
  floors,
  onToggleFloor,
  onClearFloors,
}: Props) {
  const [open, setOpen] = useState<Panel | null>(null)
  const toggle = (panel: Panel) => setOpen((cur) => (cur === panel ? null : panel))

  return (
    <div className="prefs">
      <div className="prefs-buttons">
        {onSetRoom && (
          <button
            type="button"
            className="prefs-toggle"
            data-open={open === 'room' || undefined}
            data-set={myRoom ? true : undefined}
            aria-expanded={open === 'room'}
            onClick={() => toggle('room')}
          >
            <PinIcon className="loc-icon" width={14} height={14} />
            <span className="prefs-summary">{myRoom ? `Near ${myRoom}` : 'Your room'}</span>
            <ChevronRightIcon className="prefs-chevron" width={12} height={12} />
          </button>
        )}

        {availableFloors.length > 1 && (
          <button
            type="button"
            className="prefs-toggle"
            data-open={open === 'floors' || undefined}
            data-set={floors.length ? true : undefined}
            aria-expanded={open === 'floors'}
            onClick={() => toggle('floors')}
          >
            <span className="prefs-summary">
              {floors.length ? `Floors ${floors.map(floorName).join(', ')}` : 'Floors'}
            </span>
            <ChevronRightIcon className="prefs-chevron" width={12} height={12} />
          </button>
        )}
      </div>

      {open === 'room' && onSetRoom && (
        <div className="prefs-panel">
          <LocationBar
            myRoom={myRoom ?? null}
            startEditing
            onSet={(room) => {
              onSetRoom(room)
              setOpen(null)
            }}
          />
        </div>
      )}

      {open === 'floors' && (
        <div className="prefs-panel">
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
