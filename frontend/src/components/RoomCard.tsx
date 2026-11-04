import type { Room, Status } from '../types'
import { FactChips } from './FactChips'

interface Props {
  room: Room
  status: Status
  onOpen: (room: Room) => void
}

export function RoomCard({ room, status, onOpen }: Props) {
  return (
    <button
      type="button"
      className={`card ${status.kind}`}
      onClick={() => onOpen(room)}
    >
      <div className="card-top">
        <span className="card-room">{room.room}</span>
      </div>

      <div className="card-status">
        <span className={`status-dot ${status.kind}`} />
        <span className="card-status-label">{status.label}</span>
      </div>

      <FactChips facts={room.facts} compact />
    </button>
  )
}
