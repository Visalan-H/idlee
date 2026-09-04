import type { Room, Status } from "../types";

interface Props {
  room: Room;
  status: Status;
  onOpen: (room: Room) => void;
}

export function RoomCard({ room, status, onOpen }: Props) {
  return (
    <button className={`room ${status.kind}`} onClick={() => onOpen(room)}>
      <div className="no">{room.room}</div>
      <div className="sub">{status.label}</div>
    </button>
  );
}
