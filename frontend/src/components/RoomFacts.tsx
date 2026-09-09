import { useState } from 'react'
import { castVote } from '../api'
import { CARRIER_ATTRIBUTES, PLAIN_ATTRIBUTES, consensusOf } from '../facts'
import { CheckIcon } from '../icons'
import { useMyVotes, voterId } from '../hooks/useVotes'
import type { Room } from '../types'

/**
 * The scrape knows when a room is booked and nothing else about it. Whether the
 * AC works, whether the door is ever open, whether you can charge a laptop, and
 * which SIM networks reach inside, all of that only exists in the heads of
 * people who have been in.
 */
export function RoomFacts({ room }: { room: Room }) {
  const { myVote, remember } = useMyVotes()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)

  async function vote(attribute: string, value: string) {
    setPending(`${attribute}:${value}`)
    setError(null)
    try {
      await castVote(room.room, attribute, value, voterId())
      remember(room.room, attribute, value)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vote failed.')
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="facts">
      <h3 className="schedule-heading">Room facts</h3>
      <p className="facts-note">Voted by whoever has been in. Tap what you saw.</p>

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
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className="fact-option"
                      data-mine={mine === option.value || undefined}
                      data-lead={agreed?.option.value === option.value || undefined}
                      data-warn={option.warn || undefined}
                      disabled={pending !== null}
                      aria-pressed={mine === option.value}
                      onClick={() => vote(attribute.key, option.value)}
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
            means it works in there; tapping a checked pill takes the vote back to no. */}
        <div className="fact-row">
          <div className="fact-label">
            <span>Phone signal</span>
          </div>
          <p className="facts-hint">Check the networks that get a signal in here.</p>

          <div className="carrier-pills">
            {CARRIER_ATTRIBUTES.map((attribute) => {
              const agreed = consensusOf(room.facts, attribute)
              const mine = myVote(room.room, attribute.key)
              const tally = room.facts?.[attribute.key] ?? {}
              const yes = tally.yes ?? 0
              const total = yes + (tally.no ?? 0)
              const checked = mine === 'yes'

              return (
                <button
                  key={attribute.key}
                  type="button"
                  className="carrier-pill"
                  data-checked={checked || undefined}
                  data-said-no={mine === 'no' || undefined}
                  data-lead={agreed?.option.value}
                  disabled={pending !== null}
                  aria-pressed={checked}
                  aria-label={`${attribute.label} works in this room`}
                  onClick={() => vote(attribute.key, checked ? 'no' : 'yes')}
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
