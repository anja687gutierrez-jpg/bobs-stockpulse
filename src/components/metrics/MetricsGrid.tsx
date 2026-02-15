"use client";

import { METRICS } from "@/lib/metrics";
import { MetricCard } from "./MetricCard";
import type { KeyMetric } from "@/lib/types";

interface MetricsGridProps {
  keyMetrics: KeyMetric[];
}

export function MetricsGrid({ keyMetrics }: MetricsGridProps) {
  // Use most recent metrics (first in array from FMP)
  const latest = keyMetrics[0] ?? null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {METRICS.map((metric) => {
        const value = latest ? (latest as unknown as Record<string, number>)[metric.key] ?? null : null;
        return <MetricCard key={metric.key} metric={metric} value={value} />;
      })}
    </div>
  );
}
