import { distanceLabel } from '../room'
import { ChevronRightIcon } from '../icons'
import { FactChips } from './FactChips'
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
        {/* Not simply the closest any more. A nearer room people say is locked loses to this one. */}
        <span className="badge-quiet">{where ? 'Closest good room' : 'Best pick right now'}</span>
        {where && <span className="hero-pick-distance">{where}</span>}
      </div>
      <div className="hero-pick-body">
        <div className="hero-pick-room">{room.room}</div>
        <div className="hero-pick-status">
          <span className={`status-dot ${status.kind}`} />
          <span className="status-text">{status.label}</span>
        </div>
        <ChevronRightIcon className="hero-pick-arrow" width={16} height={16} />
      </div>
      <FactChips facts={room.facts} limit={3} />
    </button>
  )
}
