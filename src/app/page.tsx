"use client";

import { useStockContext } from "@/components/StockProvider";
import { StockHeader } from "@/components/analysis/StockHeader";
import { ProjectionTable } from "@/components/analysis/ProjectionTable";
import { CaseToggle } from "@/components/analysis/CaseToggle";
import { DCFEngine } from "@/components/analysis/DCFEngine";
import { NewsAndEarnings } from "@/components/analysis/NewsAndEarnings";
import { SignalsPanel } from "@/components/analysis/SignalsPanel";
import { useProjections } from "@/hooks/useProjections";
import { useNews } from "@/hooks/useNews";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export default function AnalysisPage() {
  const { selectedSymbol, quote, incomeStatements, keyMetrics, cashFlowStatements, balanceSheetStatements, isLoading, error, portfolio, createAlert } =
    useStockContext();

  const baseRevenue = incomeStatements[0]?.revenue ?? 0;
  const sharesOutstanding = quote?.sharesOutstanding ?? 0;
  const currentPrice = quote?.regularMarketPrice ?? 0;

  const projections = useProjections(incomeStatements, keyMetrics, baseRevenue, sharesOutstanding, currentPrice);
  const { news, isLoading: newsLoading } = useNews(selectedSymbol);

  const isFavorite = selectedSymbol ? portfolio.tickers.includes(selectedSymbol) : false;

  if (!selectedSymbol) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <TrendingUp className="h-16 w-16 text-amber-400/30 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Welcome to Bob&apos;s StockPulse</h2>
        <p className="text-muted-foreground max-w-md">
          Search for a stock above to begin your 1000X analysis. The interactive projection engine
          will pre-fill with historical data — then you tweak the inputs.
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
        shares={selectedSymbol ? (portfolio.items.find((i) => i.ticker === selectedSymbol)?.shares ?? 0) : 0}
      />

      <SignalsPanel symbol={selectedSymbol} />

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">5-Year Projection Engine</CardTitle>
            <CaseToggle activeCase={projections.activeCase} onChange={projections.setActiveCase} />
          </div>
          <p className="text-xs text-muted-foreground">
            Gold inputs are editable — change growth rates, margins, and PE estimates. Projections recalculate instantly.
          </p>
        </CardHeader>
        <CardContent>
          {incomeStatements.length === 0 && !isLoading ? (
            <p className="text-muted-foreground text-sm">
              No fundamentals available (FMP may be rate-limited). Showing default projections.
            </p>
          ) : null}
          <ProjectionTable
            inputs={projections.inputs}
            rows={projections.rows}
            cagrHigh={projections.cagrHigh}
            cagrLow={projections.cagrLow}
            currentPrice={currentPrice}
            onInputChange={projections.updateYear}
          />
        </CardContent>
      </Card>

      <DCFEngine
        cashFlowStatements={cashFlowStatements}
        balanceSheetStatements={balanceSheetStatements}
        sharesOutstanding={sharesOutstanding}
        currentPrice={currentPrice}
      />

      <NewsAndEarnings
        news={news}
        isLoading={newsLoading}
        symbol={selectedSymbol}
      />
    </div>
  );
}
