import 'dotenv/config'
import { refreshAll } from '../src/services/refresh.service.js'
import { pool } from '../src/config/db.js'

console.log(await refreshAll())
await pool.end()
