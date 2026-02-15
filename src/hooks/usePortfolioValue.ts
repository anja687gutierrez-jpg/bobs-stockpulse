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

const BATCH_SIZE = 8; // Keep under Cloudflare Workers 50-subrequest limit

async function fetchBatch(
  symbols: string[]
): Promise<Record<string, { price: number; change: number }>> {
  try {
    const res = await fetch("/api/quotes-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols }),
    });
    const data = await res.json();
    return data.quotes ?? {};
  } catch {
    return {};
  }
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
      const CACHE_TTL = 60_000;

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

      // Fetch uncached in sequential batches to avoid overwhelming the Worker
      const allQuotes: Record<string, { price: number; change: number }> = {};
      if (uncached.length > 0) {
        for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
          const chunk = uncached.slice(i, i + BATCH_SIZE).map((u) => u.ticker);
          const result = await fetchBatch(chunk);
          Object.assign(allQuotes, result);
        }
      }

      const fetched: PositionData[] = uncached.map((item) => {
        const q = allQuotes[item.ticker];
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
    const priorValue = p.change !== 0 ? p.value / (1 + p.change / 100) : p.value;
    return sum + (p.value - priorValue);
  }, 0);
  const totalChange = totalValue > 0 ? (totalChangeDollar / (totalValue - totalChangeDollar)) * 100 : 0;

  return { totalValue, totalChange, totalChangeDollar, positions, isLoading };
}
