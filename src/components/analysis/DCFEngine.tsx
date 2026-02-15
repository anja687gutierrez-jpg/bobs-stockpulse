"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useDCF } from "@/hooks/useDCF";
import { formatCurrency, formatLargeNumber } from "@/lib/utils";
import { Calculator, TrendingUp, TrendingDown, Shield } from "lucide-react";
import type { CashFlowStatement, BalanceSheetStatement, DCFInputs } from "@/lib/types";

interface DCFEngineProps {
  cashFlowStatements: CashFlowStatement[];
  balanceSheetStatements: BalanceSheetStatement[];
  sharesOutstanding: number;
  currentPrice: number;
}

function DCFInput({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-amber-400/80">{label}</label>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          step="0.5"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-24 h-8 text-sm text-center bg-amber-400/5 border-amber-400/20 text-amber-400 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="text-xs text-muted-foreground">{suffix}</span>
      </div>
    </div>
  );
}

export function DCFEngine({
  cashFlowStatements,
  balanceSheetStatements,
  sharesOutstanding,
  currentPrice,
}: DCFEngineProps) {
  const { inputs, updateInput, result, baseFCF, cash, debt, hasData } = useDCF(
    cashFlowStatements,
    balanceSheetStatements,
    sharesOutstanding,
    currentPrice
  );

  const isUndervalued = result.marginOfSafety > 0;
  const absMargin = Math.abs(result.marginOfSafety);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-amber-400" />
          <CardTitle className="text-lg">10-Year DCF Intrinsic Value Engine</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          Editable assumptions drive the model. All values recalculate instantly.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* No data warning */}
        {!hasData && (
          <p className="text-muted-foreground text-sm">
            No cash flow data available (FMP API key may not be configured). Showing defaults.
          </p>
        )}

        {/* ── Inputs ── */}
        <div className="flex flex-wrap gap-6 p-4 rounded-lg bg-secondary/50 border border-border">
          <DCFInput
            label="FCF Growth Rate"
            value={inputs.fcfGrowthRate}
            onChange={(v) => updateInput("fcfGrowthRate" as keyof DCFInputs, v)}
            suffix="%"
          />
          <DCFInput
            label="Discount Rate (WACC)"
            value={inputs.discountRate}
            onChange={(v) => updateInput("discountRate" as keyof DCFInputs, v)}
            suffix="%"
          />
          <DCFInput
            label="Perpetual Growth"
            value={inputs.perpetualGrowthRate}
            onChange={(v) => updateInput("perpetualGrowthRate" as keyof DCFInputs, v)}
            suffix="%"
          />

          {/* Read-only context */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Base FCF</span>
            <span className="text-sm font-mono h-8 flex items-center">{formatLargeNumber(baseFCF)}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Cash</span>
            <span className="text-sm font-mono h-8 flex items-center">{formatLargeNumber(cash)}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Total Debt</span>
            <span className="text-sm font-mono h-8 flex items-center">{formatLargeNumber(debt)}</span>
          </div>
        </div>

        {/* ── 10-Year FCF Timeline ── */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-3">Projected Free Cash Flow &amp; Present Value</h4>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-10 gap-1 min-w-[700px]">
              {/* Year headers */}
              {result.projectedFCFs.map((_, i) => (
                <div key={i} className="text-center text-[10px] text-muted-foreground font-medium pb-1">
                  Y{i + 1}
                </div>
              ))}

              {/* FCF bars */}
              {result.projectedFCFs.map((fcf, i) => {
                const maxFCF = Math.max(...result.projectedFCFs.map(Math.abs));
                const height = maxFCF > 0 ? Math.max(12, (Math.abs(fcf) / maxFCF) * 64) : 12;
                const isNeg = fcf < 0;
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-sm transition-all ${isNeg ? "bg-red-400/30" : "bg-amber-400/30"}`}
                      style={{ height: `${height}px` }}
                    />
                    <span className={`text-[10px] font-mono ${isNeg ? "text-red-400" : "text-foreground"}`}>
                      {formatCompact(fcf)}
                    </span>
                  </div>
                );
              })}

              {/* PV row */}
              {result.presentValues.map((pv, i) => (
                <div key={i} className="text-center">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    PV: {formatCompact(pv)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals strip */}
          <div className="mt-3 flex flex-wrap gap-4 text-xs">
            <span className="text-muted-foreground">
              Sum of PVs: <span className="font-mono text-foreground">{formatLargeNumber(result.totalPVofFCFs)}</span>
            </span>
            <span className="text-muted-foreground">
              Terminal Value: <span className="font-mono text-foreground">{formatLargeNumber(result.terminalValue)}</span>
            </span>
            <span className="text-muted-foreground">
              PV of TV: <span className="font-mono text-foreground">{formatLargeNumber(result.pvOfTerminalValue)}</span>
            </span>
            <span className="text-muted-foreground">
              Enterprise Value: <span className="font-mono text-foreground font-semibold">{formatLargeNumber(result.enterpriseValue)}</span>
            </span>
          </div>
        </div>

        {/* ── The Verdict ── */}
        <div
          className={`rounded-xl p-5 border-2 ${
            isUndervalued
              ? "bg-emerald-400/5 border-emerald-400/30"
              : "bg-red-400/5 border-red-400/30"
          }`}
        >
          <div className="flex items-center gap-2 mb-4">
            <Shield className={`h-5 w-5 ${isUndervalued ? "text-emerald-400" : "text-red-400"}`} />
            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Intrinsic Value Verdict
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Intrinsic Value */}
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">Intrinsic Value / Share</div>
              <div className={`text-3xl font-bold font-mono ${isUndervalued ? "text-emerald-400" : "text-red-400"}`}>
                {formatCurrency(result.intrinsicValuePerShare)}
              </div>
            </div>

            {/* Current Price */}
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">Current Market Price</div>
              <div className="text-3xl font-bold font-mono text-foreground">
                {formatCurrency(currentPrice)}
              </div>
            </div>

            {/* Margin of Safety */}
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">Margin of Safety</div>
              <div className="flex items-center justify-center gap-2">
                <div className={`text-3xl font-bold font-mono ${isUndervalued ? "text-emerald-400" : "text-red-400"}`}>
                  {isUndervalued ? "+" : "-"}{absMargin.toFixed(1)}%
                </div>
                <Badge
                  variant="secondary"
                  className={
                    isUndervalued
                      ? "bg-emerald-400/20 text-emerald-400 border border-emerald-400/30"
                      : "bg-red-400/20 text-red-400 border border-red-400/30"
                  }
                >
                  {isUndervalued ? (
                    <><TrendingUp className="h-3 w-3 mr-1" />Undervalued</>
                  ) : (
                    <><TrendingDown className="h-3 w-3 mr-1" />Overvalued</>
                  )}
                </Badge>
              </div>
            </div>
          </div>

          {/* Equity bridge */}
          <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <span>EV {formatLargeNumber(result.enterpriseValue)}</span>
            <span>+ Cash {formatLargeNumber(cash)}</span>
            <span>- Debt {formatLargeNumber(debt)}</span>
            <span>= Equity {formatLargeNumber(result.equityValue)}</span>
            <span>/ {(sharesOutstanding / 1e9).toFixed(2)}B shares</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${abs.toFixed(0)}`;
}
