"use client";

import { useSignals } from "@/hooks/useSignals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Loader2 } from "lucide-react";
import type { SignalType } from "@/lib/types";

const BADGE_STYLES: Record<SignalType, string> = {
  buy: "bg-emerald-400/15 text-emerald-400 border-emerald-400/30",
  sell: "bg-red-400/15 text-red-400 border-red-400/30",
  attention: "bg-amber-400/15 text-amber-400 border-amber-400/30",
  swing: "bg-purple-400/15 text-purple-400 border-purple-400/30",
};

export function SignalsPanel({ symbol }: { symbol: string | null }) {
  const { signals, isLoading } = useSignals(symbol);

  if (!symbol) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-amber-400" />
          Technical Signals
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Scanning indicators...
          </div>
        ) : signals.length === 0 ? (
          <p className="text-muted-foreground text-sm py-2">
            No active signals for {symbol}
          </p>
        ) : (
          <div className="space-y-2">
            {signals.map((s, i) => (
              <div
                key={`${s.signal}-${i}`}
                className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0"
              >
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase border shrink-0 mt-0.5 ${BADGE_STYLES[s.type]}`}
                >
                  {s.type}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {s.signal}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
