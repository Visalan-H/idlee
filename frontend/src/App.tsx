import { useEffect, useMemo, useState } from "react";
import { fetchToday } from "./api";
import { RoomCard } from "./components/RoomCard";
import { RoomDialog } from "./components/RoomDialog";
import { useNow } from "./hooks/useNow";
import { fmtClock, relative, statusOf } from "./status";
import type { Room, TodayPayload } from "./types";

type View = "free" | "all";

export default function App() {
  const now = useNow();
  const [data, setData] = useState<TodayPayload | null>(null);
  const [error, setError] = useState(false);
  const [view, setView] = useState<View>("free");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Room | null>(null);

  useEffect(() => {
    fetchToday().then(setData).catch(() => setError(true));
  }, []);

  const withStatus = useMemo(
    () => (data?.rooms ?? []).map((r) => ({ room: r, status: statusOf(r, now) })),
    [data, now],
  );

  const visible = withStatus
    .filter(({ room }) => room.room.toLowerCase().includes(query))
    .filter(({ status }) => view === "all" || status.kind !== "busy");

  const freeCount = withStatus.filter((r) => r.status.kind === "free").length;

  return (
    <div className="wrap">
      <h1>Free Rooms</h1>
      <div className="clock">{fmtClock(now)} IST</div>

      <div className="stat">
        {error ? (
          "Couldn't load the schedule."
        ) : data ? (
          <>
            <b>{freeCount}</b> of {data.rooms.length} rooms free right now
          </>
        ) : (
          "Loading…"
        )}
      </div>

      <input
        type="search"
        placeholder="Search a room — 3654"
        autoComplete="off"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value.trim().toLowerCase());
          if (e.target.value) setView("all");
        }}
      />

      <div className="tabs" role="tablist">
        <button
          role="tab"
          aria-selected={view === "free"}
          onClick={() => setView("free")}
        >
          Free now
        </button>
        <button
          role="tab"
          aria-selected={view === "all"}
          onClick={() => setView("all")}
        >
          All rooms
        </button>
      </div>

      <div className="grid">
        {visible.map(({ room, status }) => (
          <RoomCard
            key={room.room}
            room={room}
            status={status}
            onOpen={setSelected}
          />
        ))}
      </div>

      {data && !visible.length && (
        <div className="empty">
          {query ? `No room matching "${query}".` : "Nothing free right now."}
        </div>
      )}

      {data?.updatedAt && (
        <div className="foot">
          Schedule refreshed {relative(data.updatedAt, now)}
          {data.staleRooms > 0 && ` · ${data.staleRooms} not reporting`}
        </div>
      )}

      <RoomDialog room={selected} now={now} onClose={() => setSelected(null)} />
    </div>
  );
}
