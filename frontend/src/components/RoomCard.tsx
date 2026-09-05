import type { Room, Status } from '../types'
import { getRoomFloor } from '../room'

interface Props {
  room: Room
  status: Status
  onOpen: (room: Room) => void
}

export function RoomCard({ room, status, onOpen }: Props) {
  const floor = getRoomFloor(room.room)

  return (
    <button
      type="button"
      className={`card ${status.kind}`}
      onClick={() => onOpen(room)}
    >
      <div className="card-top">
        <span className="card-room">{room.room}</span>
        <span className="card-floor">{floor}</span>
      </div>

      <div className="card-status">
        <span className={`status-dot ${status.kind}`} />
        <span className="card-status-label">{status.label}</span>
      </div>
    </button>
  )
}
