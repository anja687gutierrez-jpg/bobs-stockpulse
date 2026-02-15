"use client";

import { useStockContext } from "@/components/StockProvider";
import { usePortfolioValue } from "@/hooks/usePortfolioValue";
import { formatCurrency } from "@/lib/utils";
import { Briefcase, TrendingUp, TrendingDown } from "lucide-react";

export function PortfolioSummaryBar() {
  const { portfolio } = useStockContext();
  const { totalValue, totalChange, totalChangeDollar, positions, isLoading } =
    usePortfolioValue(portfolio.items);

  if (positions.length === 0 && !isLoading) return null;

  const isPositive = totalChange >= 0;

  return (
    <div className="flex items-center gap-4 px-6 py-2 border-b border-border bg-card/50 text-sm">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Briefcase className="h-3.5 w-3.5" />
        <span className="font-medium">Portfolio</span>
      </div>

      {isLoading ? (
        <span className="text-muted-foreground text-xs">Loading...</span>
      ) : (
        <>
          <span className="font-bold">{formatCurrency(totalValue)}</span>

          <span
            className={`flex items-center gap-0.5 ${
              isPositive ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {isPositive ? "+" : ""}
            {formatCurrency(Math.abs(totalChangeDollar))} ({isPositive ? "+" : ""}
            {totalChange.toFixed(2)}%)
          </span>

          <span className="text-muted-foreground">
            {positions.length} position{positions.length !== 1 ? "s" : ""}
          </span>
        </>
      )}
    </div>
  );
}
