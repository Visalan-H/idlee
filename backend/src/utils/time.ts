export function istToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

// Current IST wall clock as "HH:mm", 24 hour. India has no DST, so this is
// always UTC+5:30 with no edge cases to carry.
export function istHm(now = new Date()) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now)
}

// Minutes since midnight for an "HH:mm" string. NaN on a malformed value so the
// caller can drop it.
export function hmToMinutes(hm: string) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim())
  if (!m) return NaN
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return NaN
  return h * 60 + min
}
