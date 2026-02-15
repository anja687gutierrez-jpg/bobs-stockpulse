"use client";

import { useState, useEffect, useCallback } from "react";
import { CompareSelector } from "@/components/compare/CompareSelector";
import { CompareTable } from "@/components/compare/CompareTable";
import { useStockContext } from "@/components/StockProvider";
import type { KeyMetric } from "@/lib/types";
import { GitCompareArrows, Briefcase } from "lucide-react";

interface CompareStock {
  symbol: string;
  keyMetrics: KeyMetric[];
  isLoading: boolean;
}

export default function ComparePage() {
  const { portfolio } = useStockContext();
  const [symbols, setSymbols] = useState<string[]>([]);
  const [stocks, setStocks] = useState<CompareStock[]>([]);

  const POPULAR_TICKERS = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "TSLA", "META"];

  const sourceTickers = portfolio.tickers.length > 0 ? portfolio.tickers : POPULAR_TICKERS;
  const isFromPortfolio = portfolio.tickers.length > 0;
  const portfolioChips = sourceTickers
    .filter((t) => !symbols.includes(t))
    .slice(0, 5);

  const fetchMetrics = useCallback(async (sym: string): Promise<CompareStock> => {
    try {
      const res = await fetch(`/api/fmp?endpoint=key-metrics&symbol=${sym}`);
      const data = await res.json();
      return { symbol: sym, keyMetrics: Array.isArray(data) ? data : [], isLoading: false };
    } catch {
      return { symbol: sym, keyMetrics: [], isLoading: false };
    }
  }, []);

  useEffect(() => {
    const current = stocks.map((s) => s.symbol);
    const toAdd = symbols.filter((s) => !current.includes(s));
    const toRemove = current.filter((s) => !symbols.includes(s));

    if (toRemove.length > 0) {
      setStocks((prev) => prev.filter((s) => symbols.includes(s.symbol)));
    }

    if (toAdd.length > 0) {
      // Add loading placeholders
      setStocks((prev) => [...prev, ...toAdd.map((s) => ({ symbol: s, keyMetrics: [], isLoading: true }))]);

      // Fetch data
      Promise.all(toAdd.map(fetchMetrics)).then((results) => {
        setStocks((prev) =>
          prev.map((s) => {
            const fetched = results.find((r) => r.symbol === s.symbol);
            return fetched ?? s;
          })
        );
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols, fetchMetrics]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <GitCompareArrows className="h-6 w-6 text-amber-400" />
          <h2 className="text-2xl font-bold">Compare Stocks</h2>
        </div>
        {portfolioChips.length > 0 && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Briefcase className="h-3 w-3" />
              {isFromPortfolio ? "From your portfolio:" : "Popular stocks:"}
            </span>
            {portfolioChips.map((ticker) => (
              <button
                key={ticker}
                onClick={() => setSymbols((prev) => [...prev, ticker])}
                className="px-2 py-0.5 text-xs font-mono rounded-md border border-amber-400/30 text-amber-400 hover:bg-amber-400/10 transition-colors"
              >
                {ticker}
              </button>
            ))}
          </div>
        )}
        <CompareSelector
          symbols={symbols}
          onAdd={(s) => setSymbols((prev) => [...prev, s])}
          onRemove={(s) => setSymbols((prev) => prev.filter((x) => x !== s))}
        />
      </div>

      <CompareTable stocks={stocks} />
    </div>
  );
}
