import { fetchFmpCalendar } from "./fmp";
import type { CalendarEvent } from "./types";

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00Z");
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  return Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
}

/**
 * Get upcoming earnings and dividend events for the given tickers.
 * Returns events within the next 30 days.
 */
export async function getUpcomingEvents(
  tickers: string[]
): Promise<CalendarEvent[]> {
  if (tickers.length === 0) return [];

  const tickerSet = new Set(tickers.map((t) => t.toUpperCase()));
  const now = new Date();
  const from = now.toISOString().slice(0, 10);
  const to = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const events: CalendarEvent[] = [];

  // Fetch earnings calendar
  try {
    const earnings = await fetchFmpCalendar("earnings-calendar", from, to);
    for (const e of earnings) {
      if (tickerSet.has(e.symbol?.toUpperCase())) {
        const days = daysUntil(e.date);
        if (days >= 0) {
          events.push({
            ticker: e.symbol,
            event: "earnings",
            date: e.date,
            daysUntil: days,
            details: e.fiscalDateEnding
              ? `Fiscal ${e.fiscalDateEnding}`
              : undefined,
          });
        }
      }
    }
  } catch {
    // FMP calendar endpoint may not be available on all plans
  }

  // Fetch dividend calendar
  try {
    const dividends = await fetchFmpCalendar("dividend-calendar", from, to);
    for (const d of dividends) {
      if (tickerSet.has(d.symbol?.toUpperCase())) {
        const days = daysUntil(d.date);
        if (days >= 0) {
          events.push({
            ticker: d.symbol,
            event: "dividend",
            date: d.date,
            daysUntil: days,
            details: d.dividend
              ? `$${Number(d.dividend).toFixed(2)}/share`
              : undefined,
          });
        }
      }
    }
  } catch {
    // FMP calendar endpoint may not be available on all plans
  }

  return events.sort((a, b) => a.daysUntil - b.daysUntil);
}

/** Filter events that match reminder thresholds. */
export function filterReminders(events: CalendarEvent[]): CalendarEvent[] {
  return events.filter((e) => {
    if (e.event === "earnings") return e.daysUntil === 7 || e.daysUntil === 1;
    if (e.event === "dividend") return e.daysUntil <= 2;
    return false;
  });
}
