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

  const holdingItems = items.filter((i) => i.shares > 0);
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

      const results: PositionData[] = await Promise.all(
        holdingItems.map(async (item) => {
          const cached = cacheRef.current.get(item.ticker);
          if (cached && now - cached.ts < CACHE_TTL) {
            return {
              ticker: item.ticker,
              shares: item.shares,
              price: cached.price,
              change: cached.change,
              value: item.shares * cached.price,
            };
          }

          try {
            const res = await fetch(`/api/quote?symbol=${item.ticker}`);
            const q = await res.json();
            const price = q.regularMarketPrice ?? 0;
            const change = q.regularMarketChangePercent ?? 0;
            cacheRef.current.set(item.ticker, { price, change, ts: now });
            return {
              ticker: item.ticker,
              shares: item.shares,
              price,
              change,
              value: item.shares * price,
            };
          } catch {
            return { ticker: item.ticker, shares: item.shares, price: 0, change: 0, value: 0 };
          }
        })
      );

      if (!cancelled) {
        setPositions(results);
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
