import { readFileSync } from "node:fs";
import { pool } from "../src/db.js";

const file = process.argv[2] ?? "all_room_data.csv";
const URL_RE = /\/general\/locations\/(\d+)\/([^/]+)\//;

const lines = readFileSync(file, "utf8").trim().split(/\r?\n/).slice(1);

let seeded = 0;
let skipped = 0;

for (const line of lines) {
  const [roomNo, , url] = line.split(",");
  const match = url?.match(URL_RE);
  if (!roomNo || !match) {
    skipped++;
    continue;
  }

  await pool.query(
    `insert into rooms (room_no, location_id, token)
     values ($1, $2, $3)
     on conflict (room_no) do update
       set location_id = excluded.location_id,
           token = excluded.token,
           active = true`,
    [roomNo.trim(), Number(match[1]), match[2]],
  );
  seeded++;
}

console.log(`seeded ${seeded} rooms, skipped ${skipped}`);
await pool.end();
