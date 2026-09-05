import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchToday } from './api'
import { EmptyState } from './components/EmptyState'
import { LocationBar } from './components/LocationBar'
import { RoomCard } from './components/RoomCard'
import { RoomDialog } from './components/RoomDialog'
import { RoomRow } from './components/RoomRow'
import { StaleBanner } from './components/StaleBanner'
import { TopPick } from './components/TopPick'
import { useMyRoom } from './hooks/useMyRoom'
import { useNow } from './hooks/useNow'
import { useTheme } from './hooks/useTheme'
import { nearYouList, rankRooms, soonestToFree } from './rank'
import type { Ranked } from './rank'
import { fmtTime } from './status'
import { searchScore } from './room'
import type { Room, TodayPayload } from './types'
import { MoonIcon, SearchIcon, SunIcon, XIcon } from './icons'

type Tab = 'free' | 'all'

/** The cron refreshes every 2 hours at most, so only warn once it has clearly missed a run. */
const STALE_AFTER_MS = 3 * 60 * 60_000

export default function App() {
  const now = useNow()
  const [data, setData] = useState<TodayPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('free')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Room | null>(null)
  const [myRoom, setMyRoom] = useMyRoom()
  const { theme, toggle: toggleTheme, switching } = useTheme()

  const load = useCallback(async () => {
    try {
      setData(await fetchToday())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [])

  /** Back to how the app looks on a fresh visit: no search, no chosen room, Free now tab. */
  const reset = useCallback(() => {
    setQuery('')
    setTab('free')
    setSelected(null)
    setMyRoom(null)
  }, [setMyRoom])

  useEffect(() => {
    load()
  }, [load])

  // Coming back to the tab is the moment the data might be old. No polling.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  const ranked = useMemo(() => rankRooms(data?.rooms ?? [], now, myRoom), [data, now, myRoom])
  const freeRooms = useMemo(() => nearYouList(ranked), [ranked])
  const total = data?.rooms.length ?? 0
  const freeCount = freeRooms.length

  // Best matches first, ties keep the order the list came in with.
  const search = useCallback(
    (items: Ranked[]) =>
      items
        .map((item) => ({ item, score: searchScore(item.room.room, query) }))
        .filter((hit): hit is { item: Ranked; score: number } => hit.score !== null)
        .sort((a, b) => a.score - b.score)
        .map((hit) => hit.item),
    [query],
  )

  const filteredFree = useMemo(() => search(freeRooms), [freeRooms, search])

  const filteredAll = useMemo(
    () => search([...ranked].sort((a, b) => a.room.room.localeCompare(b.room.room))),
    [ranked, search],
  )

  const isStale =
    !!data?.updatedAt &&
    (data.staleRooms > 0 || now.getTime() - new Date(data.updatedAt).getTime() > STALE_AFTER_MS)

  const searching = query.trim().length > 0
  const topPick = searching ? null : filteredFree[0]
  const rows = topPick ? filteredFree.slice(1) : filteredFree

  return (
    <div className="container">
      <header className="header">
        <div className="header-left">
          <button type="button" className="header-title" onClick={reset}>
            Idlee
          </button>
          <a
            className="credit-tag"
            href="https://visalan.me"
            target="_blank"
            rel="noopener noreferrer"
          >
            by vizz
          </a>
        </div>
        <div className="header-right">
          {data?.updatedAt && (
            <span className="header-time">Updated {fmtTime(new Date(data.updatedAt))}</span>
          )}
          <button
            type="button"
            className="theme-toggle"
            data-busy={switching || undefined}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              toggleTheme({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
            }}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <SunIcon width={18} height={18} /> : <MoonIcon width={18} height={18} />}
          </button>
        </div>
      </header>

      {data?.updatedAt && isStale && (
        <StaleBanner updatedAt={data.updatedAt} staleRooms={data.staleRooms} now={now} />
      )}

      <LocationBar myRoom={myRoom} onSet={setMyRoom} />

      <div className="search-wrap">
        <SearchIcon className="search-icon" width={16} height={16} />
        <input
          type="search"
          placeholder="Try 3654, or 3 for the whole floor"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {searching && (
          <button
            type="button"
            className="clear-btn"
            onClick={() => setQuery('')}
            aria-label="Clear search"
          >
            <XIcon width={14} height={14} />
          </button>
        )}
      </div>

      <div className="tabs">
        <button
          type="button"
          className={`tab-item ${tab === 'free' ? 'active' : ''}`}
          onClick={() => setTab('free')}
        >
          <span>Free now</span>
          <span className="tab-pill">{freeCount}</span>
        </button>
        <button
          type="button"
          className={`tab-item ${tab === 'all' ? 'active' : ''}`}
          onClick={() => setTab('all')}
        >
          <span>All rooms</span>
          <span className="tab-pill">{total}</span>
        </button>
      </div>

      {error && (
        <EmptyState title="Couldn't load the schedule">
          <p className="emptyState-note">{error}</p>
          <button type="button" className="btn btn-dark" onClick={load}>
            Try again
          </button>
        </EmptyState>
      )}

      {!error && !data && (
        <div className="skeleton-wrap">
          <div className="skeleton-hero" />
          <div className="skeleton-row" />
          <div className="skeleton-row" />
          <div className="skeleton-row" />
        </div>
      )}

      {!error && data && tab === 'free' && (
        <main className="content">
          {topPick && (
            <TopPick ranked={topPick} myRoom={myRoom} onOpen={() => setSelected(topPick.room)} />
          )}

          {rows.length > 0 && (
            <div className="list-group">
              {rows.map((item) => (
                <RoomRow
                  key={item.room.room}
                  ranked={item}
                  myRoom={myRoom}
                  onOpen={() => setSelected(item.room)}
                />
              ))}
            </div>
          )}

          {filteredFree.length === 0 && (
            <EmptyState
              title={searching ? `No free rooms matching "${query}"` : 'No rooms free right now'}
            >
              {(() => {
                if (searching) return null
                const soonest = soonestToFree(ranked)
                if (!soonest || soonest.status.minutesUntilFree == null) {
                  return 'Every tracked room has a class on.'
                }
                return `Room ${soonest.room.room} frees up in ${soonest.status.minutesUntilFree}m.`
              })()}
            </EmptyState>
          )}
        </main>
      )}

      {!error && data && tab === 'all' && (
        <main className="content">
          <div className="grid">
            {filteredAll.map(({ room, status }) => (
              <RoomCard key={room.room} room={room} status={status} onOpen={setSelected} />
            ))}
          </div>

          {filteredAll.length === 0 && (
            <EmptyState title={`No rooms matching "${query}"`}>
              <button type="button" className="btn btn-subtle" onClick={() => setQuery('')}>
                Clear search
              </button>
            </EmptyState>
          )}
        </main>
      )}

      <RoomDialog
        room={selected}
        now={now}
        myRoom={myRoom}
        onClose={() => setSelected(null)}
        onSetLocation={setMyRoom}
      />
    </div>
  )
}
