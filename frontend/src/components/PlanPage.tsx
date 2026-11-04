import { useEffect, useMemo, useState } from 'react'
import { fetchPlan } from '../api'
import { useFloorPriority } from '../hooks/useFloorPriority'
import { useNow } from '../hooks/useNow'
import { useTheme } from '../hooks/useTheme'
import { MoonIcon, SunIcon } from '../icons'
import { PLAN_DAYS, SLOTS, at, dayLabel, dayPhrase, istDay, planRooms, slotLabel } from '../plan'
import { parseRoom } from '../room'
import { fmtTime } from '../status'
import type { PlanPayload, Room } from '../types'
import { EmptyState } from './EmptyState'
import { PrefsBar } from './PrefsBar'
import { RoomDialog } from './RoomDialog'
import { RoomRow } from './RoomRow'

/** The first slot that has not ended yet on `day`, or -1 when every one has. */
function firstOpenSlot(day: string, now: Date) {
  return SLOTS.findIndex((s) => at(day, s.end) > now)
}

export function PlanPage() {
  const now = useNow()
  const days = useMemo(() => Array.from({ length: PLAN_DAYS }, (_, i) => istDay(now, i)), [now])
  const [day, setDay] = useState(() => istDay(new Date(), 1))
  const [slotIndex, setSlotIndex] = useState(0)
  const [plans, setPlans] = useState<Record<string, PlanPayload>>({})
  const [error, setError] = useState<string | null>(null)
  // Bumped to fetch the same day again: a retry, or coming back to the tab.
  const [attempt, setAttempt] = useState(0)
  const [showUnknown, setShowUnknown] = useState(false)
  const [selected, setSelected] = useState<Room | null>(null)
  const floorPriority = useFloorPriority()
  const { theme, toggle: toggleTheme, switching } = useTheme()

  const plan = plans[day]

  useEffect(() => {
    let cancelled = false
    setError(null)
    fetchPlan(day)
      .then((data) => !cancelled && setPlans((p) => ({ ...p, [day]: data })))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : 'Unknown error'))
    return () => {
      cancelled = true
    }
  }, [day, attempt])

  // Coming back to the tab is when an evening refresh may have landed. No polling.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setAttempt((n) => n + 1)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // Time moves on under an open tab. A slot that has ended is no use to plan for,
  // so step to the next one, and past today's last slot, or midnight, to the next day.
  useEffect(() => {
    if (!days.includes(day)) {
      setDay(days[0])
      setSlotIndex(Math.max(0, firstOpenSlot(days[0], now)))
      return
    }
    if (at(day, SLOTS[slotIndex].end) > now) return
    const next = firstOpenSlot(day, now)
    if (next !== -1) {
      setSlotIndex(next)
    } else {
      setDay(days[1])
      setSlotIndex(0)
    }
  }, [now, days, day, slotIndex])

  const pickDay = (next: string) => {
    setDay(next)
    setSlotIndex(Math.max(0, firstOpenSlot(next, now)))
    setShowUnknown(false)
  }

  const slot = SLOTS[slotIndex]
  const result = useMemo(
    () => (plan ? planRooms(plan.rooms, day, slot, floorPriority.floors) : null),
    [plan, day, slot, floorPriority.floors],
  )

  const availableFloors = useMemo(
    () =>
      [...new Set((plan?.rooms ?? []).map((r) => parseRoom(r.room)?.floor))]
        .filter((f): f is number => f !== undefined)
        .sort((a, b) => a - b),
    [plan],
  )

  const openRoom = selected ? (plan?.rooms.find((r) => r.room === selected.room) ?? selected) : null
  const openCheck = openRoom && result
    ? [...result.free, ...result.unknown].find((r) => r.room.room === openRoom.room)?.check
    : null

  return (
    <div className="container">
      <header className="header">
        <div className="header-left">
          <a className="header-title" href="/">
            Idlee
          </a>
        </div>
        <div className="header-right">
          {plan?.updatedAt && (
            <span className="header-time">Updated {fmtTime(new Date(plan.updatedAt))}</span>
          )}
          <button
            type="button"
            className="theme-toggle"
            data-busy={switching || undefined}
            onClick={() => toggleTheme()}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <SunIcon width={18} height={18} /> : <MoonIcon width={18} height={18} />}
          </button>
        </div>
      </header>

      <nav className="tabs">
        <a className="tab-item" href="/">
          <span>Free now</span>
        </a>
        <a className="tab-item" href="/?tab=all">
          <span>All rooms</span>
        </a>
        <span className="tab-item active" aria-current="page">
          <span>Plan ahead</span>
        </span>
      </nav>

      <div className="plan-picker">
        <span className="floor-label">Day</span>
        <div className="floor-chips">
          {days.map((d) => (
            <button
              key={d}
              type="button"
              className="floor-chip"
              data-picked={d === day || undefined}
              aria-pressed={d === day}
              disabled={firstOpenSlot(d, now) === -1}
              onClick={() => pickDay(d)}
            >
              {dayLabel(d, now)}
            </button>
          ))}
        </div>
      </div>

      <div className="plan-picker">
        <span className="floor-label">Class time</span>
        <div className="floor-chips">
          {SLOTS.map((s, i) => {
            const over = at(day, s.end) <= now
            return (
              <button
                key={s.start}
                type="button"
                className="floor-chip"
                data-picked={i === slotIndex || undefined}
                aria-pressed={i === slotIndex}
                disabled={over}
                onClick={() => {
                  setSlotIndex(i)
                  setShowUnknown(false)
                }}
              >
                {fmtTime(at(day, s.start))}
              </button>
            )
          })}
        </div>
      </div>

      <PrefsBar
        availableFloors={availableFloors}
        floors={floorPriority.floors}
        onToggleFloor={floorPriority.toggle}
        onClearFloors={floorPriority.clear}
      />

      {error && (
        <EmptyState title="Couldn't load the schedule">
          <p className="emptyState-note">{error}</p>
          <button type="button" className="btn btn-dark" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </button>
        </EmptyState>
      )}

      {!error && !result && (
        <div className="skeleton-wrap">
          <div className="skeleton-row" />
          <div className="skeleton-row" />
          <div className="skeleton-row" />
        </div>
      )}

      {!error && result && (
        <main className="content">
          <h2 className="plan-heading">
            Free {dayPhrase(day, now)}, {slotLabel(day, slot)}
            <span className="tab-pill">{result.free.length}</span>
          </h2>

          {result.free.length > 0 ? (
            <div className="list-group">
              {result.free.map((item) => (
                <RoomRow
                  key={item.room.room}
                  ranked={item}
                  myRoom={null}
                  onOpen={() => setSelected(item.room)}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No room is certainly free then">
              {result.unknown.length > 0 && 'Some rooms below might be. Check again after the evening update.'}
            </EmptyState>
          )}

          {result.unknown.length > 0 && (
            <section className="plan-unknown">
              <button
                type="button"
                className="btn btn-subtle btn-block"
                aria-expanded={showUnknown}
                onClick={() => setShowUnknown((v) => !v)}
              >
                {showUnknown ? 'Hide' : 'Show'} {result.unknown.length} room
                {result.unknown.length === 1 ? '' : 's'} we can't confirm yet
              </button>
              {showUnknown && (
                <>
                  <p className="plan-note">
                    The portal only shows each room's next four classes. These rooms have more
                    booked before this time, so we can't see this far ahead for them yet.
                  </p>
                  <div className="list-group">
                    {result.unknown.map((item) => (
                      <RoomRow
                        key={item.room.room}
                        ranked={item}
                        myRoom={null}
                        onOpen={() => setSelected(item.room)}
                      />
                    ))}
                  </div>
                </>
              )}
            </section>
          )}

          {result.busy > 0 && (
            <p className="plan-note">
              {result.busy} room{result.busy === 1 ? ' is' : 's are'} booked then.
            </p>
          )}
        </main>
      )}

      <RoomDialog
        room={openRoom}
        now={now}
        onClose={() => setSelected(null)}
        scheduleHeading={`Classes ${dayPhrase(day, now)}`}
        slotStatus={openCheck ?? undefined}
        slotName={slotLabel(day, slot)}
      />
    </div>
  )
}
