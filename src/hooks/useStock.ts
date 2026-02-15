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

    try {
      const [quoteRes, incomeRes, ratiosRes, keyMetricsRes, cashFlowRes, balanceSheetRes] = await Promise.allSettled([
        fetch(`/api/quote?symbol=${sym}`).then((r) => r.json()),
        fetch(`/api/fmp?endpoint=income-statement&symbol=${sym}`).then((r) => r.json()),
        fetch(`/api/fmp?endpoint=ratios&symbol=${sym}`).then((r) => r.json()),
        fetch(`/api/fmp?endpoint=key-metrics&symbol=${sym}`).then((r) => r.json()),
        fetch(`/api/fmp?endpoint=cash-flow-statement&symbol=${sym}`).then((r) => r.json()),
        fetch(`/api/fmp?endpoint=balance-sheet-statement&symbol=${sym}`).then((r) => r.json()),
      ]);

      if (quoteRes.status === "fulfilled" && !quoteRes.value.error) {
        setQuote(quoteRes.value);
      } else {
        setError("Failed to fetch quote");
      }

      setIncomeStatements(
        incomeRes.status === "fulfilled" && Array.isArray(incomeRes.value) ? incomeRes.value : []
      );

      const ratiosArr = ratiosRes.status === "fulfilled" && Array.isArray(ratiosRes.value) ? ratiosRes.value : [];
      const kmArr = keyMetricsRes.status === "fulfilled" && Array.isArray(keyMetricsRes.value) ? keyMetricsRes.value : [];
      setKeyMetrics(ratiosArr.length > 0 ? buildKeyMetrics(ratiosArr, kmArr) : []);

      setCashFlowStatements(
        cashFlowRes.status === "fulfilled" && Array.isArray(cashFlowRes.value) ? cashFlowRes.value : []
      );
      setBalanceSheetStatements(
        balanceSheetRes.status === "fulfilled" && Array.isArray(balanceSheetRes.value) ? balanceSheetRes.value : []
      );
    } catch {
      setError("Failed to fetch stock data");
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
