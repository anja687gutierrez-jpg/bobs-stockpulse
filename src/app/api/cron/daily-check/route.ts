import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import YahooFinance from "yahoo-finance2";
import { getServerDb } from "@/lib/firebase-server";
import { collection, getDocs } from "firebase/firestore";
import { checkTechnicalSignals } from "@/lib/signals";
import { getUpcomingEvents, filterReminders } from "@/lib/calendar";
import {
  technicalSignalEmail,
  calendarEventEmail,
  enhancedDailySummaryEmail,
} from "@/lib/email-templates";
import type { NotificationPrefs, TechnicalSignal, CalendarEvent } from "@/lib/types";

const yahooFinance = new YahooFinance();

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const db = getServerDb();
  const stats = { checked: 0, sent: 0, errors: 0 };

  try {
    // Fetch all users
    const usersSnap = await getDocs(collection(db, "users"));
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
          ...data.notificationPrefs,
        },
      });
    }

    for (const user of users) {
      stats.checked++;

      // Fetch user's portfolio tickers
      const portfolioSnap = await getDocs(
        collection(db, "users", user.uid, "portfolio")
      );
      const portfolio: { ticker: string; shares: number }[] = [];
      for (const doc of portfolioSnap.docs) {
        const d = doc.data();
        portfolio.push({ ticker: doc.id, shares: d.shares ?? 0 });
      }

      if (portfolio.length === 0) continue;
      const tickers = portfolio.map((p) => p.ticker);

      // Technical signals
      let allSignals: TechnicalSignal[] = [];
      if (user.prefs.signalAlerts) {
        for (const ticker of tickers) {
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

        if (allSignals.length > 0) {
          try {
            const { subject, html } = technicalSignalEmail({ signals: allSignals });
            await resend.emails.send({
              from: "StockPulse <onboarding@resend.dev>",
              to: [user.email],
              subject,
              html,
            });
            stats.sent++;
          } catch {
            stats.errors++;
          }
        }
      }

      // Calendar events
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

          if (allEvents.length > 0) {
            const { subject, html } = calendarEventEmail({ events: allEvents });
            await resend.emails.send({
              from: "StockPulse <onboarding@resend.dev>",
              to: [user.email],
              subject,
              html,
            });
            stats.sent++;
          }
        } catch {
          stats.errors++;
        }
      }

      // Enhanced daily summary
      if (user.prefs.emailSummary) {
        try {
          const portfolioWithQuotes = await Promise.all(
            portfolio.map(async (p) => {
              try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const q: any = await yahooFinance.quote(p.ticker);
                const price = q.regularMarketPrice ?? 0;
                return {
                  ticker: p.ticker,
                  shares: p.shares,
                  price,
                  change: q.regularMarketChangePercent ?? 0,
                  value: p.shares * price,
                };
              } catch {
                return { ticker: p.ticker, shares: p.shares, price: 0, change: 0, value: 0 };
              }
            })
          );

          const totalValue = portfolioWithQuotes.reduce(
            (sum, h) => sum + h.shares * h.price,
            0
          );
          const totalChange =
            portfolioWithQuotes.length > 0
              ? portfolioWithQuotes.reduce((sum, h) => sum + h.change, 0) /
                portfolioWithQuotes.length
              : 0;

          const { subject, html } = enhancedDailySummaryEmail({
            portfolio: portfolioWithQuotes,
            totalValue,
            totalChange,
            signals: allSignals.length > 0 ? allSignals : undefined,
            events: allEvents.length > 0 ? allEvents : undefined,
          });

          await resend.emails.send({
            from: "StockPulse <onboarding@resend.dev>",
            to: [user.email],
            subject,
            html,
          });
          stats.sent++;
        } catch {
          stats.errors++;
        }
      }
    }

    return NextResponse.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Daily check failed";
    return NextResponse.json({ error: message, ...stats }, { status: 500 });
  }
}
