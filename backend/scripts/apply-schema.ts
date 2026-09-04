import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { pool } from '../src/config/db.js'

await pool.query(readFileSync('src/config/schema.sql', 'utf8'))
console.log('Schema applied')
await pool.end()
