import type { Facts } from './types'

export interface AttributeOption {
  value: string
  /** Button text while voting. */
  label: string
  /** Standalone text once it wins, readable without the attribute name next to it. */
  short: string
  /** Worth flagging in a list, not just inside the dialog. */
  warn?: boolean
}

export interface AttributeDef {
  key: string
  label: string
  options: AttributeOption[]
}


/**
 * The four SIM networks worth asking about. Each is its own yes/no attribute,
 * because a room that has Jio but not BSNL is the normal case, not an edge one.
 */
export const CARRIERS = [
  { key: 'jio', label: 'Jio' },
  { key: 'airtel', label: 'Airtel' },
  { key: 'vi', label: 'Vi' },
  { key: 'bsnl', label: 'BSNL' },
] as const

const CARRIER_KEYS: string[] = CARRIERS.map((c) => c.key)

/** Mirrors ATTRIBUTES in the backend. Keys and values must match or the vote is rejected. */
export const ATTRIBUTES: AttributeDef[] = [
  {
    key: 'door',
    label: 'Door',
    options: [
      { value: 'open', label: 'Usually open', short: 'Usually open' },
      { value: 'locked', label: 'Usually locked', short: 'Usually locked', warn: true },
    ],
  },
  {
    key: 'ac',
    label: 'Air conditioning',
    options: [
      { value: 'ac', label: 'AC', short: 'AC' },
      { value: 'no_ac', label: 'No AC', short: 'No AC' },
    ],
  },
  {
    key: 'power',
    label: 'Charging ports',
    options: [
      { value: 'many', label: 'Plenty', short: 'Plenty of ports' },
      { value: 'few', label: 'A few', short: 'A few ports' },
      { value: 'none', label: 'None', short: 'No ports', warn: true },
    ],
  },
  ...CARRIERS.map(
    (c): AttributeDef => ({
      key: c.key,
      label: c.label,
      options: [
        { value: 'yes', label: 'Works', short: `${c.label} works` },
        { value: 'no', label: 'No signal', short: `No ${c.label}`, warn: true },
      ],
    }),
  ),
]

/** The attributes that render as their own labelled row, carriers excluded. */
export const PLAIN_ATTRIBUTES = ATTRIBUTES.filter((a) => !CARRIER_KEYS.includes(a.key))

/** The carriers, in declaration order, for the single pill row they share. */
export const CARRIER_ATTRIBUTES = ATTRIBUTES.filter((a) => CARRIER_KEYS.includes(a.key))

/**
 * Below three votes one person decides the room, and a 50/50 split is not a
 * fact. Anything short of both bars shows as unsettled rather than guessing.
 */
const MIN_VOTES = 3
const MIN_SHARE = 0.6

export interface Consensus {
  attribute: AttributeDef
  option: AttributeOption
  votes: number
  total: number
}

export function consensusOf(facts: Facts | undefined, attribute: AttributeDef): Consensus | null {
  const tally = facts?.[attribute.key]
  if (!tally) return null

  const total = Object.values(tally).reduce((a, b) => a + b, 0)
  if (total < MIN_VOTES) return null

  const [value, votes] = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]
  if (votes / total < MIN_SHARE) return null

  const option = attribute.options.find((o) => o.value === value)
  return option ? { attribute, option, votes, total } : null
}

/** Everything the crowd has settled on for a room, in the order attributes are declared. */
export function settledFacts(facts: Facts | undefined): Consensus[] {
  if (!facts) return []
  return ATTRIBUTES.map((a) => consensusOf(facts, a)).filter((c): c is Consensus => c !== null)
}

/**
 * What each settled fact is worth in grid steps, the same unit `distance` uses,
 * where one floor is 12. The numbers say how far you should be willing to walk
 * for a good one, or to avoid a bad one.
 *
 * The scale is signed and a room nobody has voted on sits at zero, in the
 * middle. Penalties alone would mean voting can only ever hurt a room, so the
 * unmapped ones would drift to the top by saying nothing, which rewards exactly
 * the rooms we know least about.
 *
 * A locked door is the one place the scale is deliberately lopsided. Forty
 * outranks three floors of walking, because a room you cannot enter is not a
 * room, while a door merely being open is what you already expected.
 *
 * Everything else is cheap on purpose. A perfect room saves nine steps, so it
 * never beats a plain one that is a floor closer. Walking past a free room to
 * reach air conditioning upstairs is a choice, and not one the ranking should be
 * making for anybody.
 */
const COST: Record<string, Record<string, number>> = {
  door: { open: -2, locked: 40 },
  power: { many: -3, few: 0, none: 4 },
  ac: { ac: -2, no_ac: 2 },
  // Per carrier: one working network barely moves the room, four dead ones cost
  // as much as having no charging ports.
  jio: { yes: -0.5, no: 1 },
  airtel: { yes: -0.5, no: 1 },
  vi: { yes: -0.5, no: 1 },
  bsnl: { yes: -0.5, no: 1 },
}

/** Only settled facts count. An attribute nobody has agreed on is worth nothing either way. */
export function factCost(facts: Facts | undefined): number {
  return settledFacts(facts).reduce(
    (sum, c) => sum + (COST[c.attribute.key]?.[c.option.value] ?? 0),
    0,
  )
}

export function isLocked(facts: Facts | undefined): boolean {
  return settledFacts(facts).some((c) => c.attribute.key === 'door' && c.option.value === 'locked')
}

export interface FactChip {
  key: string
  text: string
  warn?: boolean
}

const CARRIER_ATTR = new Map(ATTRIBUTES.filter((a) => CARRIER_KEYS.includes(a.key)).map((a) => [a.key, a]))

/**
 * The carriers collapsed to a single chip: the networks the crowd agrees work,
 * or a dead-zone warning when every settled carrier is out. Null until at least
 * one carrier has settled.
 */
export function carrierChip(facts: Facts | undefined): FactChip | null {
  const working: string[] = []
  let deadSettled = 0
  for (const c of CARRIERS) {
    const agreed = consensusOf(facts, CARRIER_ATTR.get(c.key)!)
    if (!agreed) continue
    if (agreed.option.value === 'yes') working.push(c.label)
    else deadSettled += 1
  }
  if (working.length === CARRIERS.length) return { key: 'carrier', text: 'All carriers' }
  if (working.length) return { key: 'carrier', text: working.join(', ') }
  if (deadSettled) return { key: 'carrier', text: 'No signal', warn: true }
  return null
}

/**
 * Read-only summary chips. The carrier chip leads, because the compact lists slice
 * this to the first two and signal is the fact people scan for.
 */
export function factChips(facts: Facts | undefined): FactChip[] {
  const chips: FactChip[] = settledFacts(facts)
    .filter((c) => !CARRIER_KEYS.includes(c.attribute.key))
    .map((c) => ({ key: c.attribute.key, text: c.option.short, warn: c.option.warn }))
  const carrier = carrierChip(facts)
  return carrier ? [carrier, ...chips] : chips
}
