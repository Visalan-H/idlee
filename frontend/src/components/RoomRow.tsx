import { distanceLabel, getRoomFloor } from '../room'
import { ChevronRightIcon } from '../icons'
import type { Ranked } from '../rank'

interface Props {
  ranked: Ranked
  myRoom: string | null
  onOpen: () => void
}

export function RoomRow({ ranked, myRoom, onOpen }: Props) {
  const { room, status } = ranked
  const where = myRoom ? distanceLabel(myRoom, room.room) : null
  const floor = getRoomFloor(room.room)

  return (
    <button type="button" className="room-row" onClick={onOpen}>
      <div className="room-row-left">
        <span className={`status-dot ${status.kind}`} aria-hidden />
        <div className="room-row-title-wrap">
          <span className="room-row-name">{room.room}</span>
          <span className="room-row-floor">{floor}</span>
        </div>
      </div>

      <div className="room-row-right">
        <div className="room-row-info">
          <span className={`room-row-status ${status.kind}`}>{status.label}</span>
          {where && <span className="room-row-dist">{where}</span>}
        </div>
        <ChevronRightIcon className="room-row-arrow" width={14} height={14} />
      </div>
    </button>
  )
}
