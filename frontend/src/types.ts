export interface RoomSession {
  startsAt: string;
  endsAt: string;
  course: string | null;
}

export interface Room {
  room: string;
  fresh: boolean;
  fetchedAt: string | null;
  sessions: RoomSession[];
}

export interface TodayPayload {
  day: string;
  updatedAt: string | null;
  staleRooms: number;
  rooms: Room[];
}

export type StatusKind = "free" | "soon" | "busy" | "unknown";

export interface Status {
  kind: StatusKind;
  label: string;
}
