import { readFileSync } from "node:fs";
import { pool } from "../src/db.js";

await pool.query(readFileSync("scripts/schema.sql", "utf8"));
console.log("schema applied");
await pool.end();
