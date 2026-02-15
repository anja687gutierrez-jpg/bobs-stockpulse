import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { checkTechnicalSignals } from "@/lib/signals";

const yahooFinance = new YahooFinance();

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  try {
    const period1 = new Date();
    period1.setDate(period1.getDate() - 220);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hist: any[] = await yahooFinance.historical(symbol, {
      period1,
      period2: new Date(),
    });

    if (hist.length === 0) {
      return NextResponse.json({ signals: [] });
    }

    const history = hist.map((h) => ({
      close: h.close ?? 0,
      volume: h.volume ?? 0,
    }));

    const signals = checkTechnicalSignals(symbol, history);
    return NextResponse.json({ signals });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signal check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
