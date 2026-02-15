"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, TrendingUp, GitCompareArrows, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PortfolioDropZone } from "./PortfolioDropZone";
import { UserMenu } from "./UserMenu";
import { AlertBell } from "@/components/alerts/AlertBell";
import type { PortfolioItem } from "@/lib/types";
import type { PriceAlert } from "@/hooks/useAlerts";

interface SidebarProps {
  items: PortfolioItem[];
  tickers: string[];
  alerts: PriceAlert[];
  onSelectTicker: (symbol: string) => void;
  onRemoveTicker: (symbol: string) => void;
  onExtractedItems: (items: PortfolioItem[]) => void;
}

const navItems = [
  { href: "/", label: "Analysis", icon: TrendingUp },
  { href: "/metrics", label: "Metrics", icon: BarChart3 },
  { href: "/compare", label: "Compare", icon: GitCompareArrows },
];

export function Sidebar({ items, alerts, onSelectTicker, onRemoveTicker, onExtractedItems }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border flex flex-col z-40">
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <h1 className="text-lg font-bold">
          <span className="text-amber-400">Bob&apos;s</span> StockPulse
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">1000X Stock Analysis</p>
      </div>

      {/* Nav */}
      <nav className="p-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              pathname === href
                ? "bg-amber-400/10 text-amber-400"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Favorites */}
      <div className="flex-1 overflow-y-auto p-3 border-t border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Favorites
        </h3>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">No favorites yet</p>
        ) : (
          <div className="space-y-1">
            {items.map((item) => (
              <div
                key={item.ticker}
                className="flex items-center justify-between group"
              >
                <button
                  onClick={() => onSelectTicker(item.ticker)}
                  className="text-sm font-mono text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-2"
                >
                  {item.ticker}
                  {item.shares > 0 && (
                    <span className="text-xs text-muted-foreground font-sans">
                      {item.shares} shares
                    </span>
                  )}
                </button>
                <button
                  onClick={() => onRemoveTicker(item.ticker)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-red-400" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alerts */}
      <div className="border-t border-border">
        <AlertBell alerts={alerts} />
      </div>

      {/* Portfolio Drop Zone */}
      <div className="p-3 border-t border-border">
        <PortfolioDropZone onExtracted={onExtractedItems} />
      </div>

      {/* User Menu */}
      <div className="border-t border-border">
        <UserMenu />
      </div>
    </aside>
  );
}
