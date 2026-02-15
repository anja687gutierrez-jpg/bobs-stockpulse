import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yahooFinance.search(symbol, { newsCount: 8, quotesCount: 0 });
    const news = (result.news ?? [])
      .slice(0, 6)
      .map((n: Record<string, unknown>) => ({
        title: n.title ?? "",
        publisher: n.publisher ?? "",
        link: n.link ?? "",
        publishedAt: n.providerPublishTime
          ? (n.providerPublishTime instanceof Date
              ? (n.providerPublishTime as Date).toISOString()
              : new Date(n.providerPublishTime as string).toISOString())
          : "",
      }));

    return NextResponse.json({ news });
  } catch (err) {
    const message = err instanceof Error ? err.message : "News fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
