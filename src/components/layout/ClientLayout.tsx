"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGate } from "@/components/auth/AuthGate";
import { StockProvider, useStockContext } from "@/components/StockProvider";
import { Sidebar } from "./Sidebar";
import { SearchBar } from "./SearchBar";
import { VoiceButton } from "@/components/voice/VoiceButton";
import { ChatAgent } from "@/components/chat/ChatAgent";
import { PortfolioSummaryBar } from "./PortfolioSummaryBar";
import { Toaster } from "@/components/ui/sonner";
import { useState, type ReactNode } from "react";

function LayoutInner({ children }: { children: ReactNode }) {
  const { selectSymbol, portfolio, alerts } = useStockContext();
  const [voiceQuery, setVoiceQuery] = useState<string>();

  return (
    <div className="flex min-h-screen">
      <Sidebar
        items={portfolio.items}
        tickers={portfolio.tickers}
        alerts={alerts}
        onSelectTicker={selectSymbol}
        onRemoveTicker={portfolio.removeTicker}
        onExtractedItems={(extracted) => {
          const existing = new Set(portfolio.tickers);
          const newItems = extracted.filter((item) => {
            if (existing.has(item.ticker)) return false;
            existing.add(item.ticker);
            return true;
          });
          if (newItems.length > 0) {
            portfolio.setItems([...portfolio.items, ...newItems]);
          }
        }}
      />
      <div className="flex-1 ml-64">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-6 py-3 flex items-center gap-3">
          <SearchBar onSelect={selectSymbol} externalQuery={voiceQuery} />
          <VoiceButton onSearchQuery={setVoiceQuery} />
        </header>
        <PortfolioSummaryBar />
        <main className="p-6">{children}</main>
      </div>
      <ChatAgent />
    </div>
  );
}

export function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <AuthGate>
        <StockProvider>
          <LayoutInner>{children}</LayoutInner>
        </StockProvider>
      </AuthGate>
    </AuthProvider>
  );
}
