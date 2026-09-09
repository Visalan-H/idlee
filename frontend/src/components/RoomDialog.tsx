import { useCallback, useEffect, useRef, useState } from 'react'
import type { Room } from '../types'
import { fmtTime, relative, statusOf } from '../status'
import { distanceLabel, locationLabel, getRoomFloor } from '../room'
import { CheckIcon, XIcon, PinIcon } from '../icons'
import { RoomFacts } from './RoomFacts'

interface Props {
  room: Room | null
  now: Date
  myRoom?: string | null
  onClose: () => void
  onSetLocation?: (room: string) => void
  onVoted?: (room: string, attribute: string, prev: string | null, next: string | null) => void
}

const STATUS_TITLE: Record<string, string> = {
  free: 'Free now',
  soon: 'Free, but not for long',
  busy: 'Class in session',
  unknown: 'No recent data',
}

/** Long enough to cover the slide even if transitionend never lands. */
const SLIDE_MS = 380

export function RoomDialog({ room, now, myRoom, onClose, onSetLocation, onVoted }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  // The last room stays mounted through the slide-out, after `room` is already null.
  const [shown, setShown] = useState<Room | null>(room)
  // Drives the `.is-open` class. Toggled a frame after showModal so the slide has
  // a starting position to animate from, and cleared first thing on close.
  const [slidIn, setSlidIn] = useState(false)

  const finishClose = useCallback(() => {
    const dialog = ref.current
    if (dialog?.open) dialog.close()
    setShown(null)
  }, [])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return

    if (room) {
      setShown(room)
      if (!dialog.open) dialog.showModal()
      // Flip the class after the browser has painted the off-screen start state.
      // rAF is the right beat when visible; the timer covers a backgrounded tab
      // where rAF is parked.
      const raf = requestAnimationFrame(() => setSlidIn(true))
      const timer = setTimeout(() => setSlidIn(true), 90)
      return () => {
        cancelAnimationFrame(raf)
        clearTimeout(timer)
      }
    }

    setSlidIn(false)
    const t = setTimeout(finishClose, SLIDE_MS)
    return () => clearTimeout(t)
  }, [room, finishClose])

  const view = shown
  const status = view ? statusOf(view, now) : null
  const where = view ? locationLabel(view.room) : null
  const floor = view ? getRoomFloor(view.room) : null
  const from = view && myRoom ? distanceLabel(myRoom, view.room) : null
  const isCurrent = !!myRoom && !!view && myRoom === view.room

  return (
    <dialog
      ref={ref}
      className={slidIn ? 'dialog is-open' : 'dialog'}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onTransitionEnd={(e) => {
        if (e.target === ref.current && e.propertyName === 'translate' && !room) {
          finishClose()
        }
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      {view && (
        <div className="dialog-inner">
          <div className="sheet-handle" aria-hidden="true" />
          <div className="dialog-header">
            <div>
              <div className="dialog-meta-line">
                <span className="dialog-floor">{floor}</span>
                {from && <span className="dialog-distance">· {from}</span>}
              </div>
              <h2 className="dialog-title">{view.room}</h2>
              {where && <div className="dialog-sub">{where}</div>}
            </div>

            <button
              type="button"
              className="dialog-close-btn"
              onClick={onClose}
              aria-label="Close"
            >
              <XIcon width={16} height={16} />
            </button>
          </div>

          {status && (
            <div className={`dialog-status ${status.kind}`}>
              <span className={`status-dot ${status.kind}`} />
              <div className="dialog-status-info">
                <span className="dialog-status-title">{STATUS_TITLE[status.kind]}</span>
                <span className="dialog-status-sub">{status.label}</span>
              </div>
            </div>
          )}

          {onSetLocation && !isCurrent && (
            <button
              type="button"
              className="btn btn-subtle btn-block"
              onClick={() => onSetLocation(view.room)}
            >
              <PinIcon width={13} height={13} />
              I am in this room
            </button>
          )}
          {isCurrent && (
            <span className="current-loc-tag">
              <CheckIcon width={13} height={13} /> You are here
            </span>
          )}

          <div className="dialog-schedule">
            <h3 className="schedule-heading">Classes today</h3>
            {view.sessions.length > 0 ? (
              <div className="schedule-list">
                {view.sessions.map((s) => {
                  const start = new Date(s.startsAt)
                  const end = new Date(s.endsAt)
                  const isLive = start <= now && now < end
                  return (
                    <div key={s.startsAt} className={`schedule-row ${isLive ? 'live' : ''}`}>
                      <div className="schedule-time">
                        {fmtTime(start)} – {fmtTime(end)}
                        {isLive && <span className="live-badge">Now</span>}
                      </div>
                      <div className="schedule-course">{s.course ?? 'Booked'}</div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="no-classes">Nothing booked today.</div>
            )}
          </div>

          <RoomFacts room={view} onVoted={onVoted} />

          {view.fetchedAt && (
            <div className="dialog-footer">Checked {relative(view.fetchedAt, now)}</div>
          )}
        </div>
      )}
    </dialog>
  )
}
