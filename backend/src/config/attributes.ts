/**
 * What students can vote on for a room. The schedule scrape cannot know any of
 * this, so it comes from whoever walked in.
 *
 * Adding an attribute is an entry here and a label in the frontend's copy of
 * this list. No migration, because votes store the key and value as text.
 */
export const ATTRIBUTES = {
  ac: ['ac', 'no_ac'],
  power: ['many', 'few', 'none'],
  jio: ['yes', 'no'],
  airtel: ['yes', 'no'],
  vi: ['yes', 'no'],
  bsnl: ['yes', 'no'],
  door: ['open', 'locked'],
} as const

export type AttributeKey = keyof typeof ATTRIBUTES

/** Votes older than this stop counting. A room gets a new lock or a dead AC and the tally follows. */
export const VOTE_WINDOW_DAYS = 90

export function isValidVote(attribute: string, value: string): attribute is AttributeKey {
  const options = ATTRIBUTES[attribute as AttributeKey] as readonly string[] | undefined
  return !!options && options.includes(value)
}
