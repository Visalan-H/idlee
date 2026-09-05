import { useEffect, useRef, useState } from 'react'
import { parseRoom, getRoomFloor } from '../room'
import { PinIcon, XIcon, CheckIcon } from '../icons'

interface Props {
  myRoom: string | null
  onSet: (room: string | null) => void
}

export function LocationBar({ myRoom, onSet }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function open() {
    setDraft(myRoom ?? '')
    setError(false)
    setEditing(true)
  }

  function save() {
    const value = draft.trim()
    if (!value) {
      onSet(null)
      setEditing(false)
      return
    }
    if (!parseRoom(value)) {
      setError(true)
      return
    }
    onSet(value)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="location-box editing">
        <div className="location-input-row">
          <PinIcon className="loc-icon" width={15} height={15} />
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            placeholder="Room number, like 3654"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              setError(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                save()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                setEditing(false)
              }
            }}
          />
          <button type="button" className="btn btn-dark btn-sm" onClick={save}>
            <CheckIcon width={13} height={13} /> Set
          </button>
          <button
            type="button"
            className="btn btn-subtle btn-sm icon-only"
            onClick={() => setEditing(false)}
            aria-label="Cancel"
          >
            <XIcon width={13} height={13} />
          </button>
        </div>

        {error && <div className="loc-error">That is not a room number on the grid.</div>}
      </div>
    )
  }

  return (
    <div className="location-box">
      <button type="button" className="location-main" onClick={open}>
        <PinIcon className="loc-icon" width={15} height={15} />
        {myRoom ? (
          <span className="location-text">
            Near <strong>{myRoom}</strong>, {getRoomFloor(myRoom).toLowerCase()}
          </span>
        ) : (
          <span className="location-text muted">
            Set your room to sort by what is closest
          </span>
        )}
        <span className="location-cue">{myRoom ? 'Change' : 'Set'}</span>
      </button>

      {myRoom && (
        <button
          type="button"
          className="location-clear"
          onClick={() => onSet(null)}
          aria-label="Clear location"
        >
          <XIcon width={13} height={13} />
        </button>
      )}
    </div>
  )
}
