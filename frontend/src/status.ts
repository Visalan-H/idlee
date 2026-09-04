import type { Room, Status } from "./types";

export const IST = "Asia/Kolkata";

export const fmtTime = (d: Date): string =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);

export const fmtClock = (d: Date): string =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);

export function relative(from: string, now: Date): string {
  const mins = Math.round((now.getTime() - new Date(from).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  return hours === 1 ? "an hour ago" : `${hours} hours ago`;
}

export function statusOf(room: Room, now: Date): Status {
  if (!room.fresh) return { kind: "unknown", label: "no data" };
  if (!room.sessions.length) return { kind: "free", label: "free all day" };

  const current = room.sessions.find(
    (s) => new Date(s.startsAt) <= now && now < new Date(s.endsAt),
  );
  if (current) {
    return { kind: "busy", label: `till ${fmtTime(new Date(current.endsAt))}` };
  }

  const next = room.sessions
    .map((s) => new Date(s.startsAt))
    .filter((d) => d > now)
    .sort((a, b) => a.getTime() - b.getTime())[0];
  if (!next) return { kind: "free", label: "free rest of day" };

  const mins = Math.round((next.getTime() - now.getTime()) / 60000);
  return mins <= 30
    ? { kind: "soon", label: `class in ${mins}m` }
    : { kind: "free", label: `free till ${fmtTime(next)}` };
}
