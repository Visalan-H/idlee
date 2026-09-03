import pg from "pg";

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 10_000,
});

export interface RoomRow {
  id: number;
  room_no: string;
  location_id: number;
  token: string;
}

export function activeRooms(offset = 0, limit = 1000): Promise<RoomRow[]> {
  return pool
    .query<RoomRow>(
      `select id, room_no, location_id, token
         from rooms
        where active
        order by room_no
        offset $1 limit $2`,
      [offset, limit],
    )
    .then((r) => r.rows);
}
