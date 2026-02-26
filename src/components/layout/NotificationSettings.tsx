"use client";

import { useState } from "react";
import {
  Bell,
  Activity,
  Calendar,
  DollarSign,
  BarChart3,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";
import type { NotificationPrefs, EmailFrequency } from "@/lib/types";

interface SettingRow {
  key: keyof NotificationPrefs;
  label: string;
  description: string;
  icon: typeof Bell;
}

const settings: SettingRow[] = [
  {
    key: "emailAlerts",
    label: "Price Alerts",
    description: "Email when price targets hit",
    icon: Bell,
  },
  {
    key: "signalAlerts",
    label: "Technical Signals",
    description: "RSI, moving averages, volume spikes",
    icon: Activity,
  },
  {
    key: "swingAlerts",
    label: "Swing Trade Signals",
    description: "MACD, EMA crossovers, Bollinger breakouts",
    icon: TrendingUp,
  },
  {
    key: "earningsAlerts",
    label: "Earnings Reports",
    description: "Reminders 7 days and 1 day before",
    icon: Calendar,
  },
  {
    key: "dividendAlerts",
    label: "Dividend Dates",
    description: "Ex-dividend date reminders",
    icon: DollarSign,
  },
  {
    key: "emailSummary",
    label: "Daily Summary",
    description: "Portfolio performance after market close",
    icon: BarChart3,
  },
];

export function NotificationSettings() {
  const [open, setOpen] = useState(false);
  const { prefs, loading, updatePref } = useNotificationPrefs();

  return (
    <div className="px-3 py-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Bell className="h-3 w-3" />
          Notifications
        </span>
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
      </button>

      {open && (
        <div className="mt-2 space-y-1">
          {settings.map(({ key, label, description, icon: Icon }) => (
            <div
              key={key}
              className="flex items-center justify-between py-1.5"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground leading-tight">
                    {label}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight truncate">
                    {description}
                  </p>
                </div>
              </div>
              <button
                onClick={() => updatePref(key, !prefs[key])}
                disabled={loading}
                className={cn(
                  "relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full transition-colors duration-200",
                  prefs[key] ? "bg-amber-400" : "bg-muted-foreground/30"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-3 w-3 rounded-full bg-white shadow transform transition-transform duration-200 mt-0.5",
                    prefs[key] ? "translate-x-3.5 ml-0" : "translate-x-0.5"
                  )}
                />
              </button>
            </div>
          ))}

          {/* Email frequency */}
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-center gap-2 mb-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <p className="text-xs font-medium text-foreground">Frequency</p>
            </div>
            <div className="flex gap-1 ml-5.5">
              {([
                { value: "daily", label: "Daily" },
                { value: "weekdays", label: "Weekdays" },
                { value: "weekly", label: "Weekly" },
              ] as { value: EmailFrequency; label: string }[]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updatePref("emailFrequency", opt.value)}
                  disabled={loading}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
                    prefs.emailFrequency === opt.value
                      ? "bg-amber-400 text-black"
                      : "bg-muted-foreground/20 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
