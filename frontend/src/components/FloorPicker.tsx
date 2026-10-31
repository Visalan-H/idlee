interface Props {
  /** Every floor the building has rooms on. */
  available: number[]
  /** The student's floors, best first. */
  priority: number[]
  onToggle: (floor: number) => void
  onClear: () => void
}

const name = (floor: number) => (floor === 0 ? 'Ground floor' : `Floor ${floor}`)

export function FloorPicker({ available, priority, onToggle, onClear }: Props) {
  if (available.length < 2) return null

  return (
    <div className="floor-picker">
      <span className="floor-label">
        {priority.length ? 'Your floor order' : 'Prefer some floors? Tap them in order'}
      </span>

      <div className="floor-chips">
        {available.map((floor) => {
          const rank = priority.indexOf(floor)
          return (
            <button
              key={floor}
              type="button"
              className="floor-chip"
              data-picked={rank >= 0 || undefined}
              aria-pressed={rank >= 0}
              aria-label={rank >= 0 ? `${name(floor)}, choice ${rank + 1}` : name(floor)}
              onClick={() => onToggle(floor)}
            >
              {floor === 0 ? 'G' : floor}
              {rank >= 0 && <span className="floor-rank">{rank + 1}</span>}
            </button>
          )
        })}

        {priority.length > 0 && (
          <button type="button" className="floor-clear" onClick={onClear}>
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
