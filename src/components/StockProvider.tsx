"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { useStock } from "@/hooks/useStock";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useAlerts, type PriceAlert } from "@/hooks/useAlerts";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { alertTriggeredEmail } from "@/lib/email-templates";
import type { StockQuote, IncomeStatement, KeyMetric, CashFlowStatement, BalanceSheetStatement, PortfolioItem } from "@/lib/types";

interface StockContextValue {
  selectedSymbol: string | null;
  selectSymbol: (symbol: string) => void;
  quote: StockQuote | null;
  incomeStatements: IncomeStatement[];
  keyMetrics: KeyMetric[];
  cashFlowStatements: CashFlowStatement[];
  balanceSheetStatements: BalanceSheetStatement[];
  isLoading: boolean;
  error: string | null;
  portfolio: {
    items: PortfolioItem[];
    tickers: string[];
    addItem: (item: PortfolioItem) => void;
    addTicker: (t: string) => void;
    removeTicker: (t: string) => void;
    setItems: (items: PortfolioItem[]) => void;
  };
  alerts: PriceAlert[];
  createAlert: (alert: { ticker: string; targetPrice: number; direction: "above" | "below" }) => void;
  deleteAlert: (alertId: string) => void;
}

const StockContext = createContext<StockContextValue | null>(null);

export function StockProvider({ children }: { children: ReactNode }) {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const { quote, incomeStatements, keyMetrics, cashFlowStatements, balanceSheetStatements, isLoading, error } = useStock(selectedSymbol);
  const { user } = useAuth();
  const portfolio = usePortfolio(user?.uid ?? null);
  const { alerts, createAlert, triggerAlert, deleteAlert } = useAlerts(user?.uid ?? null);
  const { showNotification, requestPermission } = useNotifications();
  const triggeredIds = useRef<Set<string>>(new Set());

  const selectSymbol = useCallback((symbol: string) => {
    setSelectedSymbol(symbol.toUpperCase());
  }, []);

  // Request notification permission on first alert creation
  const handleCreateAlert = useCallback(
    async (alert: { ticker: string; targetPrice: number; direction: "above" | "below" }) => {
      await requestPermission();
      await createAlert(alert);
    },
    [createAlert, requestPermission]
  );

  // Check alerts against current quote price
  useEffect(() => {
    if (!quote || alerts.length === 0) return;

    const price = quote.regularMarketPrice;
    for (const alert of alerts) {
      if (alert.ticker !== quote.symbol || !alert.active) continue;
      if (triggeredIds.current.has(alert.id)) continue;

      const shouldTrigger =
        (alert.direction === "above" && price >= alert.targetPrice) ||
        (alert.direction === "below" && price <= alert.targetPrice);

      if (shouldTrigger) {
        triggeredIds.current.add(alert.id);
        triggerAlert(alert.id);
        const msg = `${alert.ticker} is now $${price.toFixed(2)} (target: $${alert.targetPrice.toFixed(2)} ${alert.direction})`;
        showNotification(`${alert.ticker} Alert Triggered`, { body: msg });
        toast.success(`${alert.ticker} Alert Triggered`, { description: msg });

        // Send email notification (fire-and-forget)
        if (user?.email) {
          const { subject, html } = alertTriggeredEmail({
            ticker: alert.ticker,
            currentPrice: price,
            targetPrice: alert.targetPrice,
            direction: alert.direction,
          });
          fetch("/api/notifications/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ to: user.email, subject, html }),
          }).catch(() => {});
        }
      }
    }
  }, [quote, alerts, triggerAlert, showNotification]);

  return (
    <StockContext.Provider
      value={{
        selectedSymbol,
        selectSymbol,
        quote,
        incomeStatements,
        keyMetrics,
        cashFlowStatements,
        balanceSheetStatements,
        isLoading,
        error,
        portfolio,
        alerts,
        createAlert: handleCreateAlert,
        deleteAlert,
      }}
    >
      {children}
    </StockContext.Provider>
  );
}

export function useStockContext() {
  const ctx = useContext(StockContext);
  if (!ctx) throw new Error("useStockContext must be used within StockProvider");
  return ctx;
}
