import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { pool } from '../src/config/db.js'
import { purgeRetiredVotes } from '../src/services/votes.service.js'

await pool.query(readFileSync('src/config/schema.sql', 'utf8'))
console.log('Schema applied')

const purged = await purgeRetiredVotes()
if (purged) console.log(`Dropped ${purged} vote(s) for retired attributes`)

await pool.end()
