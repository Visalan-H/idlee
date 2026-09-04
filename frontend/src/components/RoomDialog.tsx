import { useEffect, useRef } from "react";
import type { Room } from "../types";
import { fmtTime, relative, statusOf } from "../status";

interface Props {
  room: Room | null;
  now: Date;
  onClose: () => void;
}

export function RoomDialog({ room, now, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (room && !dialog.open) dialog.showModal();
    if (!room && dialog.open) dialog.close();
  }, [room]);

  const status = room ? statusOf(room, now) : null;

  const heading =
    !status ? ""
    : status.kind === "busy" ? `Busy — ${status.label}`
    : status.kind === "unknown" ? "Schedule hasn't loaded for this room"
    : status.label.charAt(0).toUpperCase() + status.label.slice(1);

  return (
    <dialog ref={ref} onClose={onClose}>
      {room && (
        <>
          <h2>{room.room}</h2>
          <div className="day">{heading}</div>

          {room.sessions.length ? (
            room.sessions.map((s) => {
              const start = new Date(s.startsAt);
              const end = new Date(s.endsAt);
              const live = start <= now && now < end;
              return (
                <div className={`slot${live ? " now" : ""}`} key={s.startsAt}>
                  <div className="time">
                    {fmtTime(start)} – {fmtTime(end)}
                  </div>
                  <div className="what">{s.course ?? "Booked"}</div>
                </div>
              );
            })
          ) : (
            <div className="slot">
              <div className="what">No classes scheduled today.</div>
            </div>
          )}

          {room.fetchedAt && (
            <div className="foot">Checked {relative(room.fetchedAt, now)}</div>
          )}

          <button className="close" onClick={onClose}>
            Close
          </button>
        </>
      )}
    </dialog>
  );
}
