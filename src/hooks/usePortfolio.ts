"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PortfolioItem } from "@/lib/types";

const STORAGE_KEY = "bobsstockpulse_portfolio";

function readLocalStorage(): PortfolioItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "string") {
      return (parsed as string[]).map((t) => ({ ticker: t.toUpperCase(), shares: 0 }));
    }
    return parsed;
  } catch {
    return [];
  }
}

function writeLocalStorage(items: PortfolioItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function usePortfolio(uid: string | null = null) {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const hasMigrated = useRef(false);

  // Firestore real-time sync
  useEffect(() => {
    if (!uid) {
      // No user — load from localStorage
      setItems(readLocalStorage());
      return;
    }

    const colRef = collection(db, "users", uid, "portfolio");
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const firestoreItems: PortfolioItem[] = snapshot.docs.map((d) => ({
        ticker: d.id,
        shares: d.data().shares ?? 0,
      }));

      // One-time migration: if Firestore is empty but localStorage has data
      if (firestoreItems.length === 0 && !hasMigrated.current) {
        hasMigrated.current = true;
        const local = readLocalStorage();
        if (local.length > 0) {
          const batch = writeBatch(db);
          local.forEach((item) => {
            batch.set(doc(db, "users", uid, "portfolio", item.ticker), {
              ticker: item.ticker,
              shares: item.shares,
              addedAt: serverTimestamp(),
            });
          });
          batch.commit();
          return; // onSnapshot will fire again with the migrated data
        }
      }

      setItems(firestoreItems);
      writeLocalStorage(firestoreItems); // mirror for offline
    });

    return unsubscribe;
  }, [uid]);

  const tickers = useMemo(() => items.map((i) => i.ticker), [items]);

  const addItem = useCallback(
    async (item: PortfolioItem) => {
      const upper = item.ticker.toUpperCase();
      if (uid) {
        await setDoc(doc(db, "users", uid, "portfolio", upper), {
          ticker: upper,
          shares: item.shares,
          addedAt: serverTimestamp(),
        }, { merge: true });
      } else {
        const existing = items.find((i) => i.ticker === upper);
        if (existing) {
          if (item.shares > 0 && existing.shares !== item.shares) {
            const next = items.map((i) => (i.ticker === upper ? { ...i, shares: item.shares } : i));
            setItems(next);
            writeLocalStorage(next);
          }
        } else {
          const next = [...items, { ticker: upper, shares: item.shares }];
          setItems(next);
          writeLocalStorage(next);
        }
      }
    },
    [uid, items]
  );

  const addTicker = useCallback(
    (ticker: string) => {
      addItem({ ticker: ticker.toUpperCase(), shares: 0 });
    },
    [addItem]
  );

  const removeTicker = useCallback(
    async (ticker: string) => {
      const upper = ticker.toUpperCase();
      if (uid) {
        await deleteDoc(doc(db, "users", uid, "portfolio", upper));
      } else {
        const next = items.filter((i) => i.ticker !== upper);
        setItems(next);
        writeLocalStorage(next);
      }
    },
    [uid, items]
  );

  const setItemsBulk = useCallback(
    async (newItems: PortfolioItem[]) => {
      const seen = new Set<string>();
      const unique = newItems.filter((item) => {
        const upper = item.ticker.toUpperCase();
        if (seen.has(upper)) return false;
        seen.add(upper);
        return true;
      }).map((item) => ({ ...item, ticker: item.ticker.toUpperCase() }));

      if (uid) {
        const batch = writeBatch(db);
        unique.forEach((item) => {
          batch.set(doc(db, "users", uid, "portfolio", item.ticker), {
            ticker: item.ticker,
            shares: item.shares,
            addedAt: serverTimestamp(),
          });
        });
        await batch.commit();
      } else {
        setItems(unique);
        writeLocalStorage(unique);
      }
    },
    [uid]
  );

  return { items, tickers, addItem, addTicker, removeTicker, setItems: setItemsBulk };
}
