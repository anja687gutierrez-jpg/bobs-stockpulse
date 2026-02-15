"use client";

import { useState, useEffect } from "react";
import type { TechnicalSignal } from "@/lib/types";

export function useSignals(symbol: string | null) {
  const [signals, setSignals] = useState<TechnicalSignal[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!symbol) {
      setSignals([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetch(`/api/signals?symbol=${encodeURIComponent(symbol)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setSignals(data.signals ?? []);
      })
      .catch(() => {
        if (!cancelled) setSignals([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return { signals, isLoading };
}
