import { refresh } from "../src/refresh.js";
import { pool } from "../src/db.js";

console.log(await refresh());
await pool.end();
