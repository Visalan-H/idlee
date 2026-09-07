export interface RoomSession {
  startsAt: string
  endsAt: string
  course: string | null
}

/** attribute -> value -> how many people voted for it */
export type Facts = Record<string, Record<string, number>>

export interface Room {
  room: string
  fresh: boolean
  fetchedAt: string | null
  sessions: RoomSession[]
  facts?: Facts
}

export interface TodayPayload {
  day: string
  updatedAt: string | null
  staleRooms: number
  rooms: Room[]
}

export type StatusKind = 'free' | 'soon' | 'busy' | 'unknown'

export interface Status {
  kind: StatusKind
  label: string
  /** Free/soon only: minutes until the next class starts. Undefined = free for the rest of the day. */
  minutesUntilBusy?: number
  /** Busy only: minutes until the current class ends. */
  minutesUntilFree?: number
}
