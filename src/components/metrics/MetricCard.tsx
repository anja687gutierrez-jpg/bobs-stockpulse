"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { MetricDefinition } from "@/lib/types";
import { getRating, RATING_COLORS, RATING_BG } from "@/lib/metrics";
import { formatCurrency, formatPercent, formatRatio } from "@/lib/utils";

interface MetricCardProps {
  metric: MetricDefinition;
  value: number | null;
}

function formatValue(value: number, format: MetricDefinition["format"]): string {
  switch (format) {
    case "percent":
      return formatPercent(value);
    case "currency":
      return formatCurrency(value);
    case "ratio":
      return formatRatio(value);
    case "number":
      return value.toLocaleString();
  }
}

export function MetricCard({ metric, value }: MetricCardProps) {
  if (value == null || !isFinite(value)) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="text-xs text-muted-foreground mb-1">{metric.label}</div>
          <div className="text-lg font-mono text-muted-foreground">N/A</div>
          <div className="text-xs text-muted-foreground mt-1">{metric.description}</div>
        </CardContent>
      </Card>
    );
  }

  const rating = getRating(metric, value);

  return (
    <Card className={`bg-card border-border ${RATING_BG[rating]}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">{metric.label}</span>
          <span className={`text-xs font-medium uppercase ${RATING_COLORS[rating]}`}>{rating}</span>
        </div>
        <div className={`text-xl font-mono font-bold ${RATING_COLORS[rating]}`}>
          {formatValue(value, metric.format)}
        </div>
        <div className="text-xs text-muted-foreground mt-1">{metric.description}</div>
        <div className="mt-2 flex gap-1">
          {(["excellent", "good", "fair", "poor"] as const).map((r) => (
            <div
              key={r}
              className={`h-1 flex-1 rounded-full ${r === rating ? "opacity-100" : "opacity-20"} ${
                r === "excellent" ? "bg-emerald-400" : r === "good" ? "bg-amber-400" : r === "fair" ? "bg-orange-400" : "bg-red-400"
              }`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
