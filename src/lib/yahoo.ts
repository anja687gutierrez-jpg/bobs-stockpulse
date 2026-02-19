import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

async function withRetry<T>(fn: () => Promise<T>, retries = 2, baseDelay = 500): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, baseDelay * 2 ** attempt));
    }
  }
  throw new Error("withRetry: unreachable");
}

export async function searchStocks(query: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = await withRetry(() => yahooFinance.search(query, { quotesCount: 8 }));
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

export async function getQuotesBatch(symbols: string[]): Promise<
  Record<string, { price: number; change: number }>
> {
  if (symbols.length === 0) return {};
  const results: Record<string, { price: number; change: number }> = {};

  // Process in chunks of 5 to stay well under Cloudflare's 50 subrequest limit
  for (let i = 0; i < symbols.length; i += 5) {
    const chunk = symbols.slice(i, i + 5);
    const quotes = await Promise.all(
      chunk.map(async (sym) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const q: any = await withRetry(() => yahooFinance.quote(sym));
          return {
            symbol: sym,
            price: q.regularMarketPrice ?? 0,
            change: q.regularMarketChangePercent ?? 0,
          };
        } catch {
          return { symbol: sym, price: 0, change: 0 };
        }
      })
    );
    for (const q of quotes) {
      results[q.symbol] = { price: q.price, change: q.change };
    }
  }

  return results;
}

export async function getQuote(symbol: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q: any = await withRetry(() => yahooFinance.quote(symbol));
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
