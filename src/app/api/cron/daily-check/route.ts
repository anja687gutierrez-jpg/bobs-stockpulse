import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { getServerDb } from "@/lib/firebase-server";
import { checkTechnicalSignals } from "@/lib/signals";
import { getUpcomingEvents, filterReminders } from "@/lib/calendar";
import { eveningScanEmail, morningBriefEmail, marketMoversEmail } from "@/lib/email-templates";
import type { NotificationPrefs, EmailFrequency, TechnicalSignal, CalendarEvent, GapAlert, MarketMover } from "@/lib/types";

const yahooFinance = new YahooFinance();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Cloudflare Workers free plan: 50 subrequests per invocation.
// Evening: 1 OAuth + 1 users + 1 portfolio + 44 historical + 2 calendar + 1 email = 50
// Morning: 1 OAuth + 1 users + 1 portfolio + 46 quotes + 1 email = 50
const MAX_EVENING_TICKERS = 44;
const MAX_MORNING_TICKERS = 46;
const GAP_THRESHOLD = 2; // percent

type ScanMode = "evening" | "morning" | "movers";

function shouldSendToday(frequency: EmailFrequency): boolean {
  const day = new Date().getUTCDay(); // 0=Sun, 6=Sat
  if (frequency === "daily") return true;
  if (frequency === "weekdays") return day >= 1 && day <= 5;
  if (frequency === "weekly") return day === 1; // Monday only
  return true;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const mode: ScanMode = (req.nextUrl.searchParams.get("mode") as ScanMode) || "evening";
  const resendApiKey = process.env.RESEND_API_KEY;
  const db = getServerDb();
  const stats = { mode, checked: 0, sent: 0, errors: 0, details: [] as string[] };

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

      // Skip if user's frequency doesn't match today
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

      if (mode === "movers") {
        const tickers = new Set(portfolio.map((p) => p.ticker));
        await runMoversScan(user, tickers, sendEmail);
        continue;
      }

      if (portfolio.length === 0) continue;

      if (mode === "evening") {
        await runEveningScan(user, portfolio, sendEmail);
      } else {
        await runMorningScan(user, portfolio, sendEmail);
      }
    }

    return NextResponse.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Daily check failed";
    return NextResponse.json({ error: message, ...stats }, { status: 500 });
  }
}

async function runEveningScan(
  user: { uid: string; email: string; prefs: NotificationPrefs },
  portfolio: { ticker: string; shares: number }[],
  sendEmail: (to: string, subject: string, html: string) => Promise<void>
) {
  const tickers = portfolio.map((p) => p.ticker);

  // We need a rough sort by portfolio value. First pass: fetch historical for top tickers
  // and extract closing price to sort. We'll use the historical data for signals too.
  const scanTickers = tickers.slice(0, MAX_EVENING_TICKERS);

  // Fetch historical data for all scanned tickers (1 subrequest each)
  const period1 = new Date();
  period1.setDate(period1.getDate() - 220);

  const tickerData: Map<string, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    history: any[];
    lastClose: number;
    prevClose: number;
  }> = new Map();

  for (const ticker of scanTickers) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hist: any[] = await yahooFinance.historical(ticker, {
        period1,
        period2: new Date(),
      });
      if (hist.length > 0) {
        const lastEntry = hist[hist.length - 1];
        const prevEntry = hist.length > 1 ? hist[hist.length - 2] : lastEntry;
        tickerData.set(ticker, {
          history: hist,
          lastClose: lastEntry.close ?? 0,
          prevClose: prevEntry.close ?? 0,
        });
      }
    } catch {
      // Skip ticker on error
    }
  }

  // Sort portfolio by estimated value (shares * lastClose) descending
  const portfolioWithValue = portfolio.map((p) => {
    const data = tickerData.get(p.ticker);
    const lastClose = data?.lastClose ?? 0;
    return { ...p, estimatedValue: p.shares * lastClose, hasData: !!data };
  });
  portfolioWithValue.sort((a, b) => b.estimatedValue - a.estimatedValue);

  // Run technical signals on tickers that have data
  let allSignals: TechnicalSignal[] = [];
  if (user.prefs.signalAlerts) {
    for (const item of portfolioWithValue) {
      const data = tickerData.get(item.ticker);
      if (!data || data.history.length === 0) continue;
      try {
        const history = data.history.map((h) => ({
          close: h.close ?? 0,
          volume: h.volume ?? 0,
        }));
        const signals = checkTechnicalSignals(item.ticker, history);
        allSignals.push(...signals);
      } catch {
        // Skip on error
      }
    }

    if (!user.prefs.swingAlerts) {
      allSignals = allSignals.filter((s) => s.type !== "swing");
    }
  }

  // Calendar events (2 fetch calls total)
  let allEvents: CalendarEvent[] = [];
  if (user.prefs.earningsAlerts || user.prefs.dividendAlerts) {
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

  // Build holdings list for email
  const holdings = portfolioWithValue.map((p) => {
    const data = tickerData.get(p.ticker);
    if (!data) {
      return {
        ticker: p.ticker,
        name: p.ticker,
        shares: p.shares,
        price: 0,
        change: 0,
        value: 0,
        scanned: false,
      };
    }
    const change = data.prevClose > 0
      ? ((data.lastClose - data.prevClose) / data.prevClose) * 100
      : 0;
    return {
      ticker: p.ticker,
      name: p.ticker,
      shares: p.shares,
      price: data.lastClose,
      change,
      value: p.shares * data.lastClose,
      scanned: true,
    };
  });

  const scannedHoldings = holdings.filter((h) => h.scanned);
  const totalValue = scannedHoldings.reduce((sum, h) => sum + h.value, 0);
  const totalChange = scannedHoldings.length > 0
    ? scannedHoldings.reduce((sum, h) => sum + h.change, 0) / scannedHoldings.length
    : 0;

  const { subject, html } = eveningScanEmail({
    holdings,
    totalValue,
    totalChange,
    signals: allSignals,
    events: allEvents,
    scannedCount: scannedHoldings.length,
    totalCount: portfolio.length,
  });

  await sendEmail(user.email, subject, html);
}

async function runMorningScan(
  user: { uid: string; email: string; prefs: NotificationPrefs },
  portfolio: { ticker: string; shares: number }[],
  sendEmail: (to: string, subject: string, html: string) => Promise<void>
) {
  const quoteTickers = portfolio.slice(0, MAX_MORNING_TICKERS);

  const gaps: GapAlert[] = [];
  const holdings: { ticker: string; name: string; shares: number; price: number; change: number }[] = [];

  for (const p of quoteTickers) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const q: any = await yahooFinance.quote(p.ticker);
      const price = q.regularMarketPrice ?? 0;
      const prevClose = q.regularMarketPreviousClose ?? 0;
      const changePct = q.regularMarketChangePercent ?? 0;
      const name = q.shortName ?? q.longName ?? p.ticker;

      holdings.push({
        ticker: p.ticker,
        name,
        shares: p.shares,
        price,
        change: changePct,
      });

      // Detect overnight gaps > threshold
      if (prevClose > 0 && Math.abs(changePct) >= GAP_THRESHOLD) {
        gaps.push({
          ticker: p.ticker,
          name,
          previousClose: prevClose,
          currentPrice: price,
          gapPercent: changePct,
          direction: changePct >= 0 ? "up" : "down",
        });
      }
    } catch {
      // Skip ticker on error
    }
  }

  const { subject, html } = morningBriefEmail({
    gaps,
    holdings,
    quotedCount: holdings.length,
    totalCount: portfolio.length,
  });

  await sendEmail(user.email, subject, html);
}

async function runMoversScan(
  user: { uid: string; email: string; prefs: NotificationPrefs },
  portfolioTickers: Set<string>,
  sendEmail: (to: string, subject: string, html: string) => Promise<void>
) {
  function mapScreenerResults(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    quotes: any[],
    excluded: Set<string>
  ): MarketMover[] {
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

  let gainers: MarketMover[] = [];
  let losers: MarketMover[] = [];

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gainersResult: any = await yahooFinance.screener({
      scrIds: "day_gainers",
      count: 25,
    });
    gainers = mapScreenerResults(gainersResult.quotes ?? [], portfolioTickers);
  } catch {
    // Screener may fail on some days
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const losersResult: any = await yahooFinance.screener({
      scrIds: "day_losers",
      count: 25,
    });
    losers = mapScreenerResults(losersResult.quotes ?? [], portfolioTickers);
  } catch {
    // Screener may fail on some days
  }

  if (gainers.length === 0 && losers.length === 0) return;

  const { subject, html } = marketMoversEmail({ gainers, losers });
  await sendEmail(user.email, subject, html);
}
