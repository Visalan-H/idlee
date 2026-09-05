import { distanceLabel, getRoomFloor } from '../room'
import { ChevronRightIcon } from '../icons'
import type { Ranked } from '../rank'

interface Props {
  ranked: Ranked
  myRoom: string | null
  onOpen: () => void
}

export function TopPick({ ranked, myRoom, onOpen }: Props) {
  const { room, status } = ranked
  const where = myRoom ? distanceLabel(myRoom, room.room) : null

  return (
    <button type="button" className="hero-pick" onClick={onOpen}>
      <div className="hero-pick-meta">
        <span className="badge-quiet">{where ? 'Closest free room' : 'Free the longest'}</span>
        {where && <span className="hero-pick-distance">{where}</span>}
      </div>
      <div className="hero-pick-body">
        <div className="hero-pick-room">{room.room}</div>
        <div className="hero-pick-status">
          <span className={`status-dot ${status.kind}`} />
          <span className="status-text">{status.label}</span>
        </div>
      </div>
      <div className="hero-pick-foot">
        <span className="floor-label">{getRoomFloor(room.room)}</span>
        <span className="view-link">
          Details <ChevronRightIcon width={14} height={14} />
        </span>
      </div>
    </button>
  )
}
