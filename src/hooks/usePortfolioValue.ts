"use client";

import { useState, useEffect, useRef } from "react";
import type { PortfolioItem } from "@/lib/types";

interface PositionData {
  ticker: string;
  shares: number;
  price: number;
  change: number;
  value: number;
}

interface PortfolioValueResult {
  totalValue: number;
  totalChange: number;
  totalChangeDollar: number;
  positions: PositionData[];
  isLoading: boolean;
}

export function usePortfolioValue(items: PortfolioItem[]): PortfolioValueResult {
  const [positions, setPositions] = useState<PositionData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = useRef<Map<string, { price: number; change: number; ts: number }>>(new Map());

  const holdingItems = items.map((i) => i.shares > 0 ? i : { ...i, shares: 1 });
  const holdingKey = holdingItems.map((i) => `${i.ticker}:${i.shares}`).join(",");

  useEffect(() => {
    if (holdingItems.length === 0) {
      setPositions([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    async function fetchAll() {
      const now = Date.now();
      const CACHE_TTL = 60_000; // 1 minute

      // Split into cached and uncached
      const cached: PositionData[] = [];
      const uncached: PortfolioItem[] = [];

      for (const item of holdingItems) {
        const c = cacheRef.current.get(item.ticker);
        if (c && now - c.ts < CACHE_TTL) {
          cached.push({
            ticker: item.ticker,
            shares: item.shares,
            price: c.price,
            change: c.change,
            value: item.shares * c.price,
          });
        } else {
          uncached.push(item);
        }
      }

      // Batch fetch uncached symbols
      let fetchedQuotes: Record<string, { price: number; change: number }> = {};
      if (uncached.length > 0) {
        try {
          const res = await fetch("/api/quotes-batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ symbols: uncached.map((i) => i.ticker) }),
          });
          const data = await res.json();
          fetchedQuotes = data.quotes ?? {};
        } catch {
          // Fall through with empty quotes
        }
      }

      const fetched: PositionData[] = uncached.map((item) => {
        const q = fetchedQuotes[item.ticker];
        const price = q?.price ?? 0;
        const change = q?.change ?? 0;
        if (price > 0) {
          cacheRef.current.set(item.ticker, { price, change, ts: now });
        }
        return {
          ticker: item.ticker,
          shares: item.shares,
          price,
          change,
          value: item.shares * price,
        };
      });

      if (!cancelled) {
        setPositions([...cached, ...fetched]);
        setIsLoading(false);
      }
    }

    fetchAll();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdingKey]);

  const totalValue = positions.reduce((sum, p) => sum + p.value, 0);
  const totalChangeDollar = positions.reduce((sum, p) => {
    // change is percent, so prior value = value / (1 + change/100)
    const priorValue = p.change !== 0 ? p.value / (1 + p.change / 100) : p.value;
    return sum + (p.value - priorValue);
  }, 0);
  const totalChange = totalValue > 0 ? (totalChangeDollar / (totalValue - totalChangeDollar)) * 100 : 0;

  return { totalValue, totalChange, totalChangeDollar, positions, isLoading };
}
