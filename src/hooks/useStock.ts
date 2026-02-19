"use client";

import { useState, useEffect, useCallback } from "react";
import type { StockQuote, IncomeStatement, KeyMetric, CashFlowStatement, BalanceSheetStatement } from "@/lib/types";

// Merge FMP stable "ratios" + "key-metrics" into our KeyMetric interface
function buildKeyMetrics(
  ratios: Record<string, unknown>[],
  keyMetricsRaw: Record<string, unknown>[]
): KeyMetric[] {
  return ratios.map((r, i) => {
    const km = keyMetricsRaw[i] ?? {};
    return {
      date: (r.date as string) ?? "",
      peRatio: (r.priceToEarningsRatio as number) ?? 0,
      priceToSalesRatio: (r.priceToSalesRatio as number) ?? 0,
      pbRatio: (r.priceToBookRatio as number) ?? 0,
      debtToEquity: (r.debtToEquityRatio as number) ?? 0,
      currentRatio: (r.currentRatio as number) ?? 0,
      // ROE/ROA from key-metrics are decimals (1.52 = 152%)
      returnOnEquity: ((km.returnOnEquity as number) ?? 0) * 100,
      returnOnAssets: ((km.returnOnAssets as number) ?? 0) * 100,
      revenuePerShare: (r.revenuePerShare as number) ?? 0,
      netIncomePerShare: (r.netIncomePerShare as number) ?? 0,
      freeCashFlowPerShare: (r.freeCashFlowPerShare as number) ?? 0,
      // dividendYield from ratios is decimal (0.004 = 0.4%)
      dividendYield: ((r.dividendYield as number) ?? 0) * 100,
      enterpriseValueOverEBITDA: (r.enterpriseValueMultiple as number) ?? 0,
    };
  });
}

export function useStock(symbol: string | null) {
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [incomeStatements, setIncomeStatements] = useState<IncomeStatement[]>([]);
  const [keyMetrics, setKeyMetrics] = useState<KeyMetric[]>([]);
  const [cashFlowStatements, setCashFlowStatements] = useState<CashFlowStatement[]>([]);
  const [balanceSheetStatements, setBalanceSheetStatements] = useState<BalanceSheetStatement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (sym: string) => {
    setIsLoading(true);
    setError(null);

    // Fetch with retry for 429 rate limits
    async function fetchWithRetry(url: string, retries = 2): Promise<unknown> {
      for (let attempt = 0; attempt <= retries; attempt++) {
        const res = await fetch(url);
        if (res.status === 429 && attempt < retries) {
          await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
          continue;
        }
        return res.json();
      }
      return {};
    }

    try {
      // Quote (Yahoo) fires immediately — no FMP rate limit concern
      const quoteRes = await fetchWithRetry(`/api/quote?symbol=${sym}`);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const qr = quoteRes as any;
      if (qr && !qr.error && qr.symbol) {
        setQuote(qr);
      } else {
        setError("Currently loading data…");
      }

      // FMP calls run sequentially with 300ms gaps to avoid 429
      const fmpEndpoints = ["income-statement", "ratios", "key-metrics", "cash-flow-statement", "balance-sheet-statement"] as const;
      const fmpResults: unknown[] = [];
      for (const ep of fmpEndpoints) {
        const data = await fetchWithRetry(`/api/fmp?endpoint=${ep}&symbol=${sym}`);
        fmpResults.push(data);
        await new Promise((r) => setTimeout(r, 300));
      }

      const [incomeData, ratiosData, keyMetricsData, cashFlowData, balanceSheetData] = fmpResults;

      setIncomeStatements(Array.isArray(incomeData) ? incomeData : []);

      const ratiosArr = Array.isArray(ratiosData) ? ratiosData : [];
      const kmArr = Array.isArray(keyMetricsData) ? keyMetricsData : [];
      setKeyMetrics(ratiosArr.length > 0 ? buildKeyMetrics(ratiosArr, kmArr) : []);

      setCashFlowStatements(Array.isArray(cashFlowData) ? cashFlowData : []);
      setBalanceSheetStatements(Array.isArray(balanceSheetData) ? balanceSheetData : []);
    } catch {
      setError("Currently loading data…");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (symbol) {
      fetchData(symbol);
    } else {
      setQuote(null);
      setIncomeStatements([]);
      setKeyMetrics([]);
      setCashFlowStatements([]);
      setBalanceSheetStatements([]);
    }
  }, [symbol, fetchData]);

  return { quote, incomeStatements, keyMetrics, cashFlowStatements, balanceSheetStatements, isLoading, error };
}
