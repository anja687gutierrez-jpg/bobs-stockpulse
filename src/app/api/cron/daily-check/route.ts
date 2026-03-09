import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { getServerDb } from "@/lib/firebase-server";
import { checkTechnicalSignals } from "@/lib/signals";
import { getUpcomingEvents, filterReminders } from "@/lib/calendar";
import { dailyMarketEmail, eveningScanEmail, morningBriefEmail, marketMoversEmail } from "@/lib/email-templates";
import type { NotificationPrefs, EmailFrequency, TechnicalSignal, CalendarEvent, MarketMover, TrendingStock } from "@/lib/types";

const yahooFinance = new YahooFinance();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SIGNIFICANT_CHANGE = 2; // percent

function shouldSendToday(frequency: EmailFrequency): boolean {
  const day = new Date().getUTCDay(); // 0=Sun, 6=Sat
  if (frequency === "daily") return true;
  if (frequency === "weekdays") return day >= 1 && day <= 5;
  if (frequency === "weekly") return day === 1; // Monday only
  return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapScreenerResults(quotes: any[], excluded: Set<string>): MarketMover[] {
  return quotes
    .filter((q) => !excluded.has(q.symbol))
    .map((q) => ({
      ticker: q.symbol ?? "",
      name: q.shortName ?? q.longName ?? q.symbol ?? "",
      price: q.regularMarketPrice ?? 0,
      change: q.regularMarketChange ?? 0,
      changePercent: q.regularMarketChangePercent ?? 0,
      volume: q.regularMarketVolume ?? 0,
      marketCap: q.marketCap ?? 0,
    }));
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const db = getServerDb();
  const stats = { checked: 0, sent: 0, errors: 0, details: [] as string[] };

  async function sendEmail(to: string, subject: string, html: string) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "StockPulse <notifications@goiconicway.com>",
          to: [to],
          subject,
          html,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        stats.errors++;
        stats.details.push(`${to}: ${res.status} ${body}`);
      } else {
        stats.sent++;
      }
    } catch (err) {
      stats.errors++;
      stats.details.push(`${to}: fetch error - ${err instanceof Error ? err.message : String(err)}`);
    }
    await sleep(500);
  }

  try {
    // Fetch all users
    const usersSnap = await db.collection("users").get();
    const users: {
      uid: string;
      email: string;
      prefs: NotificationPrefs;
    }[] = [];

    for (const userDoc of usersSnap.docs) {
      const data = userDoc.data();
      if (!data.email) continue;
      users.push({
        uid: userDoc.id,
        email: data.email,
        prefs: {
          emailAlerts: true,
          emailSummary: true,
          pushAlerts: true,
          signalAlerts: true,
          earningsAlerts: true,
          dividendAlerts: true,
          swingAlerts: true,
          emailFrequency: "weekdays" as EmailFrequency,
          ...data.notificationPrefs,
        },
      });
    }

    for (const user of users) {
      stats.checked++;

      if (!shouldSendToday(user.prefs.emailFrequency)) continue;

      // Fetch user's portfolio tickers
      const portfolioSnap = await db
        .collection("users")
        .doc(user.uid)
        .collection("portfolio")
        .get();
      const portfolio: { ticker: string; shares: number }[] = [];
      for (const doc of portfolioSnap.docs) {
        const d = doc.data();
        portfolio.push({ ticker: doc.id, shares: d.shares ?? 0 });
      }

      await runDailyScan(user, portfolio, sendEmail);
    }

    return NextResponse.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Daily check failed";
    return NextResponse.json({ error: message, ...stats }, { status: 500 });
  }
}

async function runDailyScan(
  user: { uid: string; email: string; prefs: NotificationPrefs },
  portfolio: { ticker: string; shares: number }[],
  sendEmail: (to: string, subject: string, html: string) => Promise<void>
) {
  const tickers = portfolio.map((p) => p.ticker);
  const tickerSet = new Set(tickers);

  // --- 1. Batch quote all portfolio tickers (1 subrequest) ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let quoteMap = new Map<string, any>();
  if (tickers.length > 0) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const quotes: any = await yahooFinance.quote(tickers);
      const quoteArr = Array.isArray(quotes) ? quotes : [quotes];
      for (const q of quoteArr) {
        if (q?.symbol) quoteMap.set(q.symbol, q);
      }
    } catch {
      // If batch fails, we still proceed with empty data
    }
  }

  // --- 2. Build holdings list ---
  const holdings = portfolio.map((p) => {
    const q = quoteMap.get(p.ticker);
    const price = q?.regularMarketPrice ?? 0;
    const changePercent = q?.regularMarketChangePercent ?? 0;
    const name = q?.shortName ?? q?.longName ?? p.ticker;
    const value = p.shares * price;
    return { ticker: p.ticker, name, shares: p.shares, price, changePercent, value };
  });

  // --- 3. Filter significant movers (≥2% change) ---
  const significantMovers = holdings
    .filter((h) => Math.abs(h.changePercent) >= SIGNIFICANT_CHANGE)
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));

  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
  const quotedHoldings = holdings.filter((h) => h.price > 0);
  const totalChange = quotedHoldings.length > 0
    ? quotedHoldings.reduce((sum, h) => sum + h.changePercent, 0) / quotedHoldings.length
    : 0;

  // --- 4. Fetch 220-day historical ONLY for significant movers (for technical signals) ---
  let allSignals: TechnicalSignal[] = [];
  if (user.prefs.signalAlerts && significantMovers.length > 0) {
    const period1 = new Date();
    period1.setDate(period1.getDate() - 220);

    for (const mover of significantMovers) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hist: any[] = await yahooFinance.historical(mover.ticker, {
          period1,
          period2: new Date(),
        });
        if (hist.length > 0) {
          const history = hist.map((h) => ({
            close: h.close ?? 0,
            volume: h.volume ?? 0,
          }));
          const signals = checkTechnicalSignals(mover.ticker, history);
          allSignals.push(...signals);
        }
      } catch {
        // Skip ticker on error
      }
    }

    if (!user.prefs.swingAlerts) {
      allSignals = allSignals.filter((s) => s.type !== "swing");
    }
  }

  // --- 5. Calendar events ---
  let allEvents: CalendarEvent[] = [];
  if (tickers.length > 0 && (user.prefs.earningsAlerts || user.prefs.dividendAlerts)) {
    try {
      const events = await getUpcomingEvents(tickers);
      const reminders = filterReminders(events);
      allEvents = reminders.filter((e) => {
        if (e.event === "earnings") return user.prefs.earningsAlerts;
        if (e.event === "dividend") return user.prefs.dividendAlerts;
        return false;
      });
    } catch {
      // Calendar errors are non-critical
    }
  }

  // --- 6. Screener: day_gainers + day_losers, exclude portfolio ---
  let gainers: MarketMover[] = [];
  let losers: MarketMover[] = [];

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gainersResult: any = await yahooFinance.screener({
      scrIds: "day_gainers",
      count: 25,
    });
    gainers = mapScreenerResults(gainersResult.quotes ?? [], tickerSet).slice(0, 10);
  } catch {
    // Screener may fail on some days
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const losersResult: any = await yahooFinance.screener({
      scrIds: "day_losers",
      count: 25,
    });
    losers = mapScreenerResults(losersResult.quotes ?? [], tickerSet).slice(0, 10);
  } catch {
    // Screener may fail on some days
  }

  // --- 7. Trending symbols ---
  let trending: TrendingStock[] = [];
  try {
    const trendingResult = await yahooFinance.trendingSymbols("US", { count: 20 });
    const trendingTickers = trendingResult.quotes
      .map((q) => q.symbol)
      .filter((s) => !tickerSet.has(s));

    if (trendingTickers.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const trendingQuotes: any = await yahooFinance.quote(trendingTickers);
      const trendingArr = Array.isArray(trendingQuotes) ? trendingQuotes : [trendingQuotes];
      trending = trendingArr
        .filter((q: { regularMarketPrice?: number }) => q?.regularMarketPrice)
        .map((q: {
          symbol?: string;
          shortName?: string;
          longName?: string;
          regularMarketPrice?: number;
          regularMarketChangePercent?: number;
          regularMarketVolume?: number;
        }) => ({
          ticker: q.symbol ?? "",
          name: q.shortName ?? q.longName ?? q.symbol ?? "",
          price: q.regularMarketPrice ?? 0,
          changePercent: q.regularMarketChangePercent ?? 0,
          volume: q.regularMarketVolume ?? 0,
        }));
    }
  } catch {
    // Trending is non-critical
  }

  // --- 8. Send unified email ---
  const { subject, html } = dailyMarketEmail({
    holdings,
    significantMovers,
    totalValue,
    totalChange,
    signals: allSignals,
    events: allEvents,
    gainers,
    losers,
    trending,
  });

  await sendEmail(user.email, subject, html);
}
