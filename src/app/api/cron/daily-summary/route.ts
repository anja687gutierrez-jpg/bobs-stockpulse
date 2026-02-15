import { NextRequest, NextResponse } from "next/server";
import { dailySummaryEmail } from "@/lib/email-templates";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  try {
    const { to, portfolio } = await req.json();

    if (!to || !portfolio || !Array.isArray(portfolio)) {
      return NextResponse.json({ error: "Missing to or portfolio" }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const totalValue = portfolio.reduce(
      (sum: number, h: { shares: number; price: number }) => sum + h.shares * h.price,
      0
    );
    const totalChange =
      portfolio.length > 0
        ? portfolio.reduce((sum: number, h: { change: number }) => sum + h.change, 0) / portfolio.length
        : 0;

    const { subject, html } = dailySummaryEmail({ portfolio, totalValue, totalChange });

    const { data, error } = await resend.emails.send({
      from: "StockPulse <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data?.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Summary send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
