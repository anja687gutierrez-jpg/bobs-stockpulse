import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { getServerDb } from "@/lib/firebase-server";
import { checkTechnicalSignals } from "@/lib/signals";
import { getUpcomingEvents, filterReminders } from "@/lib/calendar";
import { enhancedDailySummaryEmail } from "@/lib/email-templates";
import type { NotificationPrefs, EmailFrequency, TechnicalSignal, CalendarEvent } from "@/lib/types";

const yahooFinance = new YahooFinance();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Cloudflare Workers free plan: 50 subrequests per invocation.
// Budget: 1 OAuth + 1 Firestore users + per user (1 portfolio + signals + 2 calendar + quotes + 1 email)
// Cap expensive operations to stay under the limit.
const MAX_SIGNAL_TICKERS = 5;
const MAX_QUOTE_TICKERS = 15;

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

      if (portfolio.length === 0) continue;
      const tickers = portfolio.map((p) => p.ticker);

      // Technical signals (capped to conserve subrequests)
      let allSignals: TechnicalSignal[] = [];
      if (user.prefs.signalAlerts) {
        const signalTickers = tickers.slice(0, MAX_SIGNAL_TICKERS);
        for (const ticker of signalTickers) {
          try {
            const period1 = new Date();
            period1.setDate(period1.getDate() - 220);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const hist: any[] = await yahooFinance.historical(ticker, {
              period1,
              period2: new Date(),
            });
            if (hist.length > 0) {
              const history = hist.map((h) => ({
                close: h.close ?? 0,
                volume: h.volume ?? 0,
              }));
              const signals = checkTechnicalSignals(ticker, history);
              allSignals.push(...signals);
            }
          } catch {
            // Skip ticker on error
          }
        }

        // Filter out swing signals if user hasn't opted in
        if (!user.prefs.swingAlerts) {
          allSignals = allSignals.filter((s) => s.type !== "swing");
        }
      }

      // Calendar events (2 fetch calls total regardless of ticker count)
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

      // Daily summary with quotes (capped to conserve subrequests)
      try {
        const quoteTickers = portfolio.slice(0, MAX_QUOTE_TICKERS);
        const portfolioWithQuotes = await Promise.all(
          quoteTickers.map(async (p) => {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const q: any = await yahooFinance.quote(p.ticker);
              const price = q.regularMarketPrice ?? 0;
              return {
                ticker: p.ticker,
                name: q.shortName ?? q.longName ?? p.ticker,
                shares: p.shares,
                price,
                change: q.regularMarketChangePercent ?? 0,
                value: p.shares * price,
              };
            } catch {
              return { ticker: p.ticker, name: p.ticker, shares: p.shares, price: 0, change: 0, value: 0 };
            }
          })
        );

        // Add remaining tickers without quotes
        for (let i = MAX_QUOTE_TICKERS; i < portfolio.length; i++) {
          portfolioWithQuotes.push({
            ticker: portfolio[i].ticker,
            name: portfolio[i].ticker,
            shares: portfolio[i].shares,
            price: 0,
            change: 0,
            value: 0,
          });
        }

        const quotedHoldings = portfolioWithQuotes.filter((h) => h.price > 0);
        const totalValue = quotedHoldings.reduce(
          (sum, h) => sum + h.value,
          0
        );
        const totalChange =
          quotedHoldings.length > 0
            ? quotedHoldings.reduce((sum, h) => sum + h.change, 0) /
              quotedHoldings.length
            : 0;

        const { subject, html } = enhancedDailySummaryEmail({
          portfolio: portfolioWithQuotes.filter((h) => h.price > 0),
          totalValue,
          totalChange,
          signals: allSignals.length > 0 ? allSignals : undefined,
          events: allEvents.length > 0 ? allEvents : undefined,
        });

        await sendEmail(user.email, subject, html);
      } catch {
        stats.errors++;
      }
    }

    return NextResponse.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Daily check failed";
    return NextResponse.json({ error: message, ...stats }, { status: 500 });
  }
}
