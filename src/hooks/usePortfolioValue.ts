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

const BATCH_SIZE = 25;
const CACHE_TTL = 5 * 60_000; // 5 minutes
const DEBOUNCE_MS = 500;
const BATCH_DELAY_MS = 200;

async function fetchBatch(
  symbols: string[]
): Promise<Record<string, { price: number; change: number }>> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch("/api/quotes-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.quotes ?? {};
      }
      // 5xx — retry once after 1s
      if (res.status >= 500 && attempt === 0) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      return {};
    } catch {
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      return {};
    }
  }
  return {};
}

export function usePortfolioValue(items: PortfolioItem[]): PortfolioValueResult {
  const [positions, setPositions] = useState<PositionData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = useRef<Map<string, { price: number; change: number; ts: number }>>(new Map());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const holdingItems = items.map((i) => i.shares > 0 ? i : { ...i, shares: 1 });
  const holdingKey = holdingItems.map((i) => `${i.ticker}:${i.shares}`).join(",");

  useEffect(() => {
    if (holdingItems.length === 0) {
      setPositions([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    // Debounce: coalesce rapid setItems calls from multi-screenshot processing
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (cancelled) return;
      fetchAll();
    }, DEBOUNCE_MS);

    async function fetchAll() {
      const now = Date.now();

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

      // Fetch uncached sequentially — one Worker invocation at a time to avoid contention
      const allQuotes: Record<string, { price: number; change: number }> = {};
      if (uncached.length > 0) {
        const symbolBatches: string[][] = [];
        for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
          symbolBatches.push(uncached.slice(i, i + BATCH_SIZE).map((u) => u.ticker));
        }
        for (let i = 0; i < symbolBatches.length; i++) {
          if (cancelled) return;
          const result = await fetchBatch(symbolBatches[i]);
          Object.assign(allQuotes, result);
          // Brief delay between batches to avoid Worker contention
          if (i < symbolBatches.length - 1) {
            await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
          }
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

    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
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
