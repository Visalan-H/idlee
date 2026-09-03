import * as cheerio from "cheerio";

export interface ScrapedSession {
  day: string;
  startsAt: string;
  endsAt: string;
  course: string | null;
}

const UA = "room-free/1.0";

const MONTHS: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

const META =
  /^(\d{2})\s+([A-Za-z]{3})\s+(\d{4})\s*\|\s*.*?\s*\|\s*(\d{2}:\d{2}:\d{2})\s*-\s*(\d{2}:\d{2}:\d{2})$/;

export function parse(html: string): ScrapedSession[] {
  const $ = cheerio.load(html);
  const sessions: ScrapedSession[] = [];

  $(".session-card").each((_, el) => {
    const card = $(el);

    const meta = card
      .find(".text-muted")
      .toArray()
      .map((node) => $(node).text().trim().match(META))
      .find((m): m is RegExpMatchArray => m !== null);
    if (!meta) return;

    const [, dd, mon, yyyy, start, end] = meta;
    const month = MONTHS[mon];
    if (!month) return;

    const day = `${yyyy}-${month}-${dd}`;
    sessions.push({
      day,
      startsAt: `${day}T${start}+05:30`,
      endsAt: `${day}T${end}+05:30`,
      course: card.find("h2").first().text().trim() || null,
    });
  });

  return sessions;
}

async function fetchSessions(url: string, timeoutMs: number) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parse(await res.text());
}

export async function scrapeRoom(
  locationId: number,
  token: string,
  timeoutMs = 15000,
): Promise<ScrapedSession[]> {
  const url = `https://learner.saveetha.in/general/locations/${locationId}/${token}/?scope=future`;

  try {
    return await fetchSessions(url, timeoutMs);
  } catch {
    await new Promise((r) => setTimeout(r, 2500));
    return fetchSessions(url, timeoutMs);
  }
}

export function istToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
