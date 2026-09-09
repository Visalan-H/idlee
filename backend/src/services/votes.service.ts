import { createHash } from 'node:crypto'
import { pool } from '../config/db.js'
import { ATTRIBUTES, VOTE_WINDOW_DAYS } from '../config/attributes.js'

/** attribute -> value -> how many people said it */
export type Facts = Record<string, Record<string, number>>

interface TallyRow {
  room_no: string
  attribute: string
  value: string
  n: number
}

/**
 * A voter id is a random string the browser keeps in localStorage. Storing it
 * raw would make the table a per-device history of where someone has been, so
 * it is salted and hashed and the original never reaches Postgres.
 */
function hash(value: string) {
  const salt = process.env.VOTE_SALT ?? process.env.REFRESH_SECRET
  if (!salt) throw new Error('VOTE_SALT is not set, refusing to store unsalted voter ids')
  return createHash('sha256').update(`${salt}:${value}`).digest('hex')
}

export async function getFacts(): Promise<Map<string, Facts>> {
  const { rows } = await pool.query<TallyRow>(
    `select r.room_no, v.attribute, v.value, count(*)::int as n
       from room_votes v
       join rooms r on r.id = v.room_id
      where v.created_at > now() - ($1 || ' days')::interval
        and v.attribute = any($2)
      group by r.room_no, v.attribute, v.value`,
    [VOTE_WINDOW_DAYS, Object.keys(ATTRIBUTES)],
  )

  const byRoom = new Map<string, Facts>()

  for (const row of rows) {
    let facts = byRoom.get(row.room_no)
    if (!facts) {
      facts = {}
      byRoom.set(row.room_no, facts)
    }
    facts[row.attribute] ??= {}
    facts[row.attribute][row.value] = row.n
  }

  return byRoom
}

export type VoteResult = 'ok' | 'unknown-room'

export async function castVote(opts: {
  room: string
  attribute: string
  value: string
  voterId: string
}): Promise<VoteResult> {
  const voter = hash(opts.voterId)

  // One row per person per attribute per room. Changing your mind overwrites.
  const { rowCount } = await pool.query(
    `insert into room_votes (room_id, attribute, value, voter)
     select id, $2, $3, $4 from rooms where room_no = $1 and active
     on conflict (room_id, attribute, voter)
     do update set value = excluded.value, created_at = now()`,
    [opts.room, opts.attribute, opts.value, voter],
  )

  return rowCount === 0 ? 'unknown-room' : 'ok'
}

/**
 * Drops votes for attributes that no longer exist, `network` from before it was
 * split per SIM carrier being the first of them. Driven off ATTRIBUTES rather
 * than a hardcoded list, so retiring the next one needs no second edit here.
 * Run by `npm run schema`; getFacts already ignores these rows either way.
 */
export async function purgeRetiredVotes(): Promise<number> {
  const { rowCount } = await pool.query(`delete from room_votes where attribute <> all($1)`, [
    Object.keys(ATTRIBUTES),
  ])
  return rowCount ?? 0
}
