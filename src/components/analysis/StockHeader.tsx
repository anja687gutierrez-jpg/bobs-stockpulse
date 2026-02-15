"use client";

import type { StockQuote } from "@/lib/types";
import { formatCurrency, formatLargeNumber, formatPercent } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Star } from "lucide-react";
import { PriceAlertModal } from "@/components/alerts/PriceAlertModal";

interface StockHeaderProps {
  quote: StockQuote | null;
  isLoading: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onCreateAlert?: (alert: { ticker: string; targetPrice: number; direction: "above" | "below" }) => void;
}

export function StockHeader({ quote, isLoading, isFavorite, onToggleFavorite, onCreateAlert }: StockHeaderProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-32" />
        <div className="flex gap-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
    );
  }

  if (!quote) return null;

  const isPositive = quote.regularMarketChange >= 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold">{quote.symbol}</h2>
        <span className="text-lg text-muted-foreground">{quote.shortName}</span>
        <div className="ml-auto flex items-center gap-1">
          {onCreateAlert && (
            <PriceAlertModal
              ticker={quote.symbol}
              currentPrice={quote.regularMarketPrice}
              onCreateAlert={onCreateAlert}
            />
          )}
          <button onClick={onToggleFavorite}>
            <Star
              className={`h-5 w-5 transition-colors ${
                isFavorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground hover:text-amber-400"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-bold">{formatCurrency(quote.regularMarketPrice)}</span>
        <Badge
          variant="secondary"
          className={isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}
        >
          {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
          {formatCurrency(Math.abs(quote.regularMarketChange))} ({formatPercent(quote.regularMarketChangePercent)})
        </Badge>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
        <span>Mkt Cap: <span className="text-foreground">{formatLargeNumber(quote.marketCap)}</span></span>
        <span>Shares: <span className="text-foreground">{formatLargeNumber(quote.sharesOutstanding).replace("$", "")}</span></span>
        <span>Day Range: <span className="text-foreground">{formatCurrency(quote.regularMarketDayLow)} – {formatCurrency(quote.regularMarketDayHigh)}</span></span>
        <span>52W: <span className="text-foreground">{formatCurrency(quote.fiftyTwoWeekLow)} – {formatCurrency(quote.fiftyTwoWeekHigh)}</span></span>
        <span>Vol: <span className="text-foreground">{quote.regularMarketVolume.toLocaleString()}</span></span>
      </div>
    </div>
  );
}
