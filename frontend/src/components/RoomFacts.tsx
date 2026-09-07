import { useState } from 'react'
import { castVote } from '../api'
import { ATTRIBUTES, consensusOf } from '../facts'
import { useMyVotes, voterId } from '../hooks/useVotes'
import type { Room } from '../types'

/**
 * The scrape knows when a room is booked and nothing else about it. Whether the
 * AC works, whether the door is ever open, whether you can charge a laptop, all
 * of that only exists in the heads of people who have been inside.
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
        {ATTRIBUTES.map((attribute) => {
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
      </div>

      {error && <p className="facts-error">{error}</p>}
    </div>
  )
}
