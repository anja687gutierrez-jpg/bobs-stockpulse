"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGate } from "@/components/auth/AuthGate";
import { StockProvider, useStockContext } from "@/components/StockProvider";
import { Sidebar } from "./Sidebar";
import { SearchBar } from "./SearchBar";
import { ChatAgent } from "@/components/chat/ChatAgent";
import { Toaster } from "@/components/ui/sonner";
import type { ReactNode } from "react";

function LayoutInner({ children }: { children: ReactNode }) {
  const { selectSymbol, portfolio, alerts } = useStockContext();

  return (
    <div className="flex min-h-screen">
      <Sidebar
        items={portfolio.items}
        tickers={portfolio.tickers}
        alerts={alerts}
        onSelectTicker={selectSymbol}
        onRemoveTicker={portfolio.removeTicker}
        onExtractedItems={(extracted) => {
          extracted.forEach((item) => portfolio.addItem(item));
        }}
      />
      <div className="flex-1 ml-64">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-6 py-3">
          <SearchBar onSelect={selectSymbol} />
        </header>
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
