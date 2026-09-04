import type { TodayPayload } from "./types";

const BASE = import.meta.env.VITE_API_URL ?? "";

export async function fetchToday(): Promise<TodayPayload> {
  const res = await fetch(`${BASE}/api/rooms`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
