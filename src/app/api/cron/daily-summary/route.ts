import { NextRequest, NextResponse } from "next/server";
import { dailySummaryEmail } from "@/lib/email-templates";

export async function POST(req: NextRequest) {
  try {
    const { to, portfolio } = await req.json();

    if (!to || !portfolio || !Array.isArray(portfolio)) {
      return NextResponse.json({ error: "Missing to or portfolio" }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
    }

    const totalValue = portfolio.reduce(
      (sum: number, h: { shares: number; price: number }) => sum + h.shares * h.price,
      0
    );
    const totalChange =
      portfolio.length > 0
        ? portfolio.reduce((sum: number, h: { change: number }) => sum + h.change, 0) / portfolio.length
        : 0;

    const { subject, html } = dailySummaryEmail({ portfolio, totalValue, totalChange });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
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
      const body = await res.json().catch(() => ({ message: res.statusText }));
      return NextResponse.json({ error: body.message ?? res.statusText }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ id: data.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Summary send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
