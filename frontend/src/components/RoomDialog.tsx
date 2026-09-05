import { useEffect, useRef } from 'react'
import type { Room } from '../types'
import { fmtTime, relative, statusOf } from '../status'
import { distanceLabel, locationLabel, getRoomFloor } from '../room'
import { CheckIcon, XIcon, PinIcon } from '../icons'

interface Props {
  room: Room | null
  now: Date
  myRoom?: string | null
  onClose: () => void
  onSetLocation?: (room: string) => void
}

const STATUS_TITLE: Record<string, string> = {
  free: 'Free now',
  soon: 'Free, but not for long',
  busy: 'Class in session',
  unknown: 'No recent data',
}

export function RoomDialog({ room, now, myRoom, onClose, onSetLocation }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (room && !dialog.open) dialog.showModal()
    else if (!room && dialog.open) dialog.close()
  }, [room])

  const status = room ? statusOf(room, now) : null
  const where = room ? locationLabel(room.room) : null
  const floor = room ? getRoomFloor(room.room) : null
  const from = room && myRoom ? distanceLabel(myRoom, room.room) : null
  const isCurrent = !!myRoom && !!room && myRoom === room.room

  return (
    <dialog
      ref={ref}
      className="dialog"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      {room && (
        <div className="dialog-inner">
          <div className="dialog-header">
            <div>
              <div className="dialog-meta-line">
                <span className="dialog-floor">{floor}</span>
                {from && <span className="dialog-distance">· {from}</span>}
              </div>
              <h2 className="dialog-title">{room.room}</h2>
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
              onClick={() => onSetLocation(room.room)}
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
            {room.sessions.length > 0 ? (
              <div className="schedule-list">
                {room.sessions.map((s) => {
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

          {room.fetchedAt && (
            <div className="dialog-footer">Checked {relative(room.fetchedAt, now)}</div>
          )}
        </div>
      )}
    </dialog>
  )
}
