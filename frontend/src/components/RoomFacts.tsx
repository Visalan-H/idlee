import { useRef, useState } from 'react'
import { castVote, clearVote } from '../api'
import { CARRIER_ATTRIBUTES, PLAIN_ATTRIBUTES, consensusOf } from '../facts'
import { CheckIcon } from '../icons'
import { useMyVotes, voterId } from '../hooks/useVotes'
import type { Room } from '../types'

interface Props {
  room: Room
  /** Reports the voter's own before and after, so the cached tally can move on tap. */
  onVoted?: (room: string, attribute: string, prev: string | null, next: string | null) => void
}

/**
 * The scrape knows when a room is booked and nothing else about it. Whether the
 * AC works, whether the door is ever open, whether you can charge a laptop, and
 * which SIM networks reach inside, all of that only exists in the heads of
 * people who have been in.
 */
export function RoomFacts({ room, onVoted }: Props) {
  const { myVote, remember, forget } = useMyVotes()
  const [error, setError] = useState<string | null>(null)

  // Newest tap per attribute. A request that resolves after a later one has
  // already started is stale, and must not touch the UI either way.
  const seq = useRef<Record<string, number>>({})

  /**
   * Applies the vote locally first and sends it after, so a tap lands at the speed of
   * a checkbox rather than of the network. If the request fails the change is put back
   * and the error explains why, which is the honest version of an instant response.
   *
   * A null value takes the vote back rather than answering the other way. The two are
   * different: voting no keeps you in the denominator, withdrawing does not, so a room
   * nobody has an opinion on can go back to reading as unsettled.
   */
  async function submit(attribute: string, value: string | null) {
    const prev = myVote(room.room, attribute)
    if (prev === value) return

    const ticket = (seq.current[attribute] ?? 0) + 1
    seq.current[attribute] = ticket

    const write = (to: string | null) => {
      if (to === null) forget(room.room, attribute)
      else remember(room.room, attribute, to)
    }

    write(value)
    onVoted?.(room.room, attribute, prev, value)
    setError(null)

    try {
      if (value === null) await clearVote(room.room, attribute, voterId())
      else await castVote(room.room, attribute, value, voterId())
    } catch (err) {
      // Rolling back after a newer tap would stomp an answer the voter has since
      // given. The newer request owns the outcome; this one just goes quiet.
      if (seq.current[attribute] !== ticket) return

      write(prev)
      onVoted?.(room.room, attribute, value, prev)
      setError(err instanceof Error ? err.message : 'Vote failed.')
    }
  }

  return (
    <div className="facts">
      <h3 className="schedule-heading">Room facts</h3>
      <p className="facts-note">Voted by whoever has been in. Tap what you saw, tap again to undo.</p>

      <div className="facts-list">
        {PLAIN_ATTRIBUTES.map((attribute) => {
          const agreed = consensusOf(room.facts, attribute)
          const mine = myVote(room.room, attribute.key)
          const tally = room.facts?.[attribute.key] ?? {}

          return (
            <div key={attribute.key} className="fact-row">
              <div className="fact-label">
                <span>{attribute.label}</span>
                {agreed && (
                  <span className="fact-count">
                    {agreed.votes} of {agreed.total}
                  </span>
                )}
              </div>

              <div className="fact-options">
                {attribute.options.map((option) => {
                  const count = tally[option.value] ?? 0
                  const picked = mine === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className="fact-option"
                      data-mine={picked || undefined}
                      data-lead={agreed?.option.value === option.value || undefined}
                      data-warn={option.warn || undefined}
                      aria-pressed={picked}
                      // Tapping what you already picked withdraws it.
                      onClick={() => submit(attribute.key, picked ? null : option.value)}
                    >
                      {option.label}
                      {count > 0 && <span className="fact-option-count">{count}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* One pill per network instead of four near-identical yes/no rows. Checked
            means it works in there. Tapping cycles through the three real answers:
            nothing said, works, does not work, and back to nothing said. */}
        <div className="fact-row">
          <div className="fact-label">
            <span>Phone signal</span>
          </div>
          <p className="facts-hint">
            Check the networks that get a signal. Tap twice if there is none, three times to undo.
          </p>

          <div className="carrier-pills">
            {CARRIER_ATTRIBUTES.map((attribute) => {
              const agreed = consensusOf(room.facts, attribute)
              const mine = myVote(room.room, attribute.key)
              const tally = room.facts?.[attribute.key] ?? {}
              const yes = tally.yes ?? 0
              const total = yes + (tally.no ?? 0)
              const checked = mine === 'yes'
              const next = mine === null ? 'yes' : mine === 'yes' ? 'no' : null

              return (
                <button
                  key={attribute.key}
                  type="button"
                  className="carrier-pill"
                  data-checked={checked || undefined}
                  data-said-no={mine === 'no' || undefined}
                  data-lead={agreed?.option.value}
                  aria-pressed={checked}
                  aria-label={`${attribute.label} works in this room`}
                  onClick={() => submit(attribute.key, next)}
                >
                  <span className="carrier-check" aria-hidden="true">
                    {checked && <CheckIcon width={11} height={11} />}
                  </span>
                  {attribute.label}
                  {total > 0 && (
                    <span className="fact-option-count">
                      {yes}/{total}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {error && <p className="facts-error">{error}</p>}
    </div>
  )
}
