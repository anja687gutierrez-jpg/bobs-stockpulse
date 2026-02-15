import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export async function searchStocks(query: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = await yahooFinance.search(query, { quotesCount: 8 });
  const quotes = result.quotes ?? [];
  return quotes
    .filter((q: Record<string, unknown>) => q.symbol && q.quoteType === "EQUITY")
    .map((q: Record<string, unknown>) => ({
      symbol: q.symbol as string,
      shortname: (q.shortname ?? q.symbol) as string,
      exchange: (q.exchange ?? "") as string,
      quoteType: q.quoteType as string,
    }));
}

export async function getQuote(symbol: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q: any = await yahooFinance.quote(symbol);
  return {
    symbol: q.symbol ?? symbol,
    shortName: q.shortName ?? q.symbol ?? symbol,
    regularMarketPrice: q.regularMarketPrice ?? 0,
    regularMarketChange: q.regularMarketChange ?? 0,
    regularMarketChangePercent: q.regularMarketChangePercent ?? 0,
    regularMarketDayHigh: q.regularMarketDayHigh ?? 0,
    regularMarketDayLow: q.regularMarketDayLow ?? 0,
    regularMarketVolume: q.regularMarketVolume ?? 0,
    marketCap: q.marketCap ?? 0,
    sharesOutstanding: q.sharesOutstanding ?? 0,
    fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? 0,
    fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? 0,
    currency: q.currency ?? "USD",
  };
}
