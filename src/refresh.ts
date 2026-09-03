import { pool, activeRooms, type RoomRow } from "./db.js";
import { istToday, scrapeRoom } from "./scrape.js";

const CONCURRENCY = 6;
const BUDGET_MS = 45_000;

export interface RefreshResult {
  ok: number;
  failed: number;
  rooms: number;
  ms: number;
  done: boolean;
  nextOffset: number | null;
}

async function refreshRoom(room: RoomRow, now: Date): Promise<void> {
  const scraped = await scrapeRoom(room.location_id, room.token);
  const sessions = scraped.filter((s) => new Date(s.startsAt) > now);
  const client = await pool.connect();

  try {
    await client.query("begin");
    await client.query(
      `delete from sessions where room_id = $1 and starts_at > $2`,
      [room.id, now],
    );

    for (const s of sessions) {
      await client.query(
        `insert into sessions (room_id, day, starts_at, ends_at, course)
         values ($1, $2, $3, $4, $5)
         on conflict (room_id, starts_at) do update
           set ends_at = excluded.ends_at, course = excluded.course`,
        [room.id, s.day, s.startsAt, s.endsAt, s.course],
      );
    }

    await client.query(`update rooms set fetched_at = now() where id = $1`, [
      room.id,
    ]);
    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

export async function refresh(
  opts: { offset?: number; limit?: number } = {},
): Promise<RefreshResult> {
  const started = Date.now();
  const offset = opts.offset ?? 0;
  const rooms = await activeRooms(offset, opts.limit ?? 1000);
  const now = new Date();

  let cursor = 0;
  let ok = 0;
  let failed = 0;

  async function worker() {
    while (cursor < rooms.length && Date.now() - started < BUDGET_MS) {
      const room = rooms[cursor++];
      try {
        await refreshRoom(room, now);
        ok++;
      } catch (err) {
        failed++;
        console.error(`refresh failed for room ${room.room_no}`, err);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, rooms.length) }, worker),
  );

  const ms = Date.now() - started;
  const attempted = ok + failed;
  const done = attempted >= rooms.length;

  await pool.query(
    `insert into refresh_runs (ok, failed, ms) values ($1, $2, $3)`,
    [ok, failed, ms],
  );

  return {
    ok,
    failed,
    rooms: rooms.length,
    ms,
    done,
    nextOffset: done ? null : offset + attempted,
  };
}

export interface RoomDay {
  room: string;
  fresh: boolean;
  sessions: { startsAt: string; endsAt: string; course: string | null }[];
}

export async function today(): Promise<{
  day: string;
  updatedAt: string | null;
  rooms: RoomDay[];
}> {
  const day = istToday();

  const { rows } = await pool.query<{
    room_no: string;
    fresh: boolean;
    starts_at: Date | null;
    ends_at: Date | null;
    course: string | null;
  }>(
    `select r.room_no,
            r.fetched_at > now() - interval '20 hours' as fresh,
            s.starts_at, s.ends_at, s.course
       from rooms r
       left join sessions s on s.room_id = r.id and s.day = $1
      where r.active
      order by r.room_no, s.starts_at`,
    [day],
  );

  const byRoom = new Map<string, RoomDay>();
  for (const row of rows) {
    let entry = byRoom.get(row.room_no);
    if (!entry) {
      entry = { room: row.room_no, fresh: row.fresh === true, sessions: [] };
      byRoom.set(row.room_no, entry);
    }
    if (row.starts_at && row.ends_at) {
      entry.sessions.push({
        startsAt: row.starts_at.toISOString(),
        endsAt: row.ends_at.toISOString(),
        course: row.course,
      });
    }
  }

  const run = await pool.query<{ ran_at: Date }>(
    `select ran_at from refresh_runs order by ran_at desc limit 1`,
  );

  return {
    day,
    updatedAt: run.rows[0]?.ran_at.toISOString() ?? null,
    rooms: [...byRoom.values()],
  };
}
