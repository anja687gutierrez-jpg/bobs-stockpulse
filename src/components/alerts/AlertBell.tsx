"use client";

import { Bell } from "lucide-react";
import type { PriceAlert } from "@/hooks/useAlerts";

interface AlertBellProps {
  alerts: PriceAlert[];
}

export function AlertBell({ alerts }: AlertBellProps) {
  const activeCount = alerts.filter((a) => a.active).length;

  if (activeCount === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <div className="relative">
        <Bell className="h-4 w-4 text-amber-400" />
        <span className="absolute -top-1 -right-1.5 h-3.5 w-3.5 rounded-full bg-amber-400 text-[10px] font-bold text-black flex items-center justify-center">
          {activeCount}
        </span>
      </div>
      <span className="text-xs text-muted-foreground">
        {activeCount} active alert{activeCount !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
