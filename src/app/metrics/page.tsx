"use client";

import { useStockContext } from "@/components/StockProvider";
import { StockHeader } from "@/components/analysis/StockHeader";
import { MetricsGrid } from "@/components/metrics/MetricsGrid";
import { BarChart3 } from "lucide-react";

export default function MetricsPage() {
  const { selectedSymbol, quote, keyMetrics, isLoading, error, portfolio, createAlert } = useStockContext();

  const isFavorite = selectedSymbol ? portfolio.tickers.includes(selectedSymbol) : false;

  if (!selectedSymbol) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <BarChart3 className="h-16 w-16 text-amber-400/30 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Mandatory Metrics</h2>
        <p className="text-muted-foreground max-w-md">
          Search for a stock to view 12 key metrics with color-coded quality ranges.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-400/10 border border-red-400/20 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <StockHeader
        quote={quote}
        isLoading={isLoading}
        isFavorite={isFavorite}
        onToggleFavorite={() => {
          if (selectedSymbol) {
            isFavorite ? portfolio.removeTicker(selectedSymbol) : portfolio.addTicker(selectedSymbol);
          }
        }}
        onCreateAlert={createAlert}
      />

      <div>
        <h3 className="text-lg font-semibold mb-4">12 Mandatory Metrics</h3>
        {keyMetrics.length === 0 && !isLoading ? (
          <p className="text-muted-foreground text-sm">
            No metrics available. FMP API key may not be configured.
          </p>
        ) : (
          <MetricsGrid keyMetrics={keyMetrics} />
        )}
      </div>
    </div>
  );
}
