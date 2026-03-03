"use client";

import { useState, useEffect, useRef } from "react";
import type { TechnicalSignal } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";
import { checkSignalCooldown, setSignalCooldown } from "@/lib/signal-cooldown";
import { technicalSignalEmail } from "@/lib/email-templates";

export function useSignals(symbol: string | null) {
  const [signals, setSignals] = useState<TechnicalSignal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { prefs, loading: prefsLoading } = useNotificationPrefs();
  const sentRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!symbol) {
      setSignals([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetch(`/api/signals?symbol=${encodeURIComponent(symbol)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setSignals(data.signals ?? []);
      })
      .catch(() => {
        if (!cancelled) setSignals([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  // Real-time email alerts for strong buy/sell signals
  useEffect(() => {
    if (!symbol || !user?.email || prefsLoading || !prefs.signalAlerts) return;

    const strongSignals = signals.filter(
      (s) => s.type === "buy" || s.type === "sell"
    );
    if (strongSignals.length === 0) return;

    const key = `${symbol}:${user.uid}`;
    if (sentRef.current.has(key)) return;
    sentRef.current.add(key);

    (async () => {
      try {
        const onCooldown = await checkSignalCooldown(user.uid, symbol);
        if (onCooldown) return;

        const { subject, html } = technicalSignalEmail({ signals: strongSignals });
        const { getFirebaseAuth } = await import("@/lib/firebase");
        const auth = await getFirebaseAuth();
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) return;
        await fetch("/api/notifications/send-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`,
          },
          body: JSON.stringify({ to: user.email, subject, html }),
        });

        await setSignalCooldown(user.uid, symbol);
      } catch {
        // Remove from sent set so it can retry next navigation
        sentRef.current.delete(key);
      }
    })();
  }, [signals, symbol, user, prefs.signalAlerts, prefsLoading]);

  return { signals, isLoading };
}
