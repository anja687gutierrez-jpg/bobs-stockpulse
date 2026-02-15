"use client";

import { useState, useEffect } from "react";
import type { NewsArticle } from "@/lib/types";

export function useNews(symbol: string | null) {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!symbol) {
      setNews([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetch(`/api/news?symbol=${encodeURIComponent(symbol)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setNews(data.news ?? []);
      })
      .catch(() => {
        if (!cancelled) setNews([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return { news, isLoading };
}
