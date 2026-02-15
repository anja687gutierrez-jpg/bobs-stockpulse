"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { METRICS, getRating, RATING_COLORS } from "@/lib/metrics";
import { formatCurrency, formatPercent, formatRatio } from "@/lib/utils";
import type { KeyMetric, MetricDefinition } from "@/lib/types";

interface CompareStock {
  symbol: string;
  keyMetrics: KeyMetric[];
  isLoading: boolean;
}

interface CompareTableProps {
  stocks: CompareStock[];
}

function formatValue(value: number | null, format: MetricDefinition["format"]): string {
  if (value == null || !isFinite(value)) return "N/A";
  switch (format) {
    case "percent": return formatPercent(value);
    case "currency": return formatCurrency(value);
    case "ratio": return formatRatio(value);
    case "number": return value.toLocaleString();
  }
}

export function CompareTable({ stocks }: CompareTableProps) {
  if (stocks.length === 0) {
    return <p className="text-muted-foreground text-sm">Add tickers above to compare</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border">
            <TableHead className="text-muted-foreground">Metric</TableHead>
            {stocks.map((s) => (
              <TableHead key={s.symbol} className="text-center font-mono text-amber-400">
                {s.symbol}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {METRICS.map((metric) => (
            <TableRow key={metric.key} className="border-border">
              <TableCell className="text-xs font-medium">{metric.label}</TableCell>
              {stocks.map((s) => {
                if (s.isLoading) {
                  return (
                    <TableCell key={s.symbol} className="text-center">
                      <Skeleton className="h-5 w-16 mx-auto" />
                    </TableCell>
                  );
                }
                const latest = s.keyMetrics[0];
                const value = latest ? (latest as unknown as Record<string, number>)[metric.key] ?? null : null;
                const rating = value != null && isFinite(value) ? getRating(metric, value) : null;
                return (
                  <TableCell key={s.symbol} className={`text-center text-sm font-mono ${rating ? RATING_COLORS[rating] : "text-muted-foreground"}`}>
                    {formatValue(value, metric.format)}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
