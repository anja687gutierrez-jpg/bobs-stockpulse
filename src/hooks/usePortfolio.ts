"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { getFirebaseDb } from "@/lib/firebase";
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
  const [items, setItems] = useState<PortfolioItem[]>(() => readLocalStorage());
  const hasMigrated = useRef(false);

  useEffect(() => {
    if (!uid) {
      setItems(readLocalStorage());
      return;
    }

    let unsubscribe: (() => void) | undefined;

    (async () => {
      const db = await getFirebaseDb();
      const { collection, onSnapshot, doc, writeBatch, serverTimestamp } = await import("firebase/firestore");
      const colRef = collection(db, "users", uid, "portfolio");

      unsubscribe = onSnapshot(colRef, (snapshot) => {
        const firestoreItems: PortfolioItem[] = snapshot.docs.map((d) => ({
          ticker: d.id,
          shares: d.data().shares ?? 0,
        }));

        if (firestoreItems.length === 0 && !hasMigrated.current) {
          hasMigrated.current = true;
          const local = readLocalStorage();
          if (local.length > 0) {
            // Migrate localStorage → Firestore
            const batch = writeBatch(db);
            local.forEach((item) => {
              batch.set(doc(db, "users", uid, "portfolio", item.ticker), {
                ticker: item.ticker,
                shares: item.shares,
                addedAt: serverTimestamp(),
              });
            });
            batch.commit();
            // Show localStorage data immediately while Firestore syncs
            setItems(local);
            return;
          }
        }

        if (firestoreItems.length > 0) {
          setItems(firestoreItems);
          writeLocalStorage(firestoreItems);
        }
      });
    })();

    return () => unsubscribe?.();
  }, [uid]);

  const tickers = useMemo(() => items.map((i) => i.ticker), [items]);

  const addItem = useCallback(
    async (item: PortfolioItem) => {
      const upper = item.ticker.toUpperCase();
      if (uid) {
        const db = await getFirebaseDb();
        const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
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
        const db = await getFirebaseDb();
        const { doc, deleteDoc } = await import("firebase/firestore");
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

      // Optimistic update — show data immediately
      setItems(unique);
      writeLocalStorage(unique);

      if (uid) {
        try {
          const db = await getFirebaseDb();
          const { doc, writeBatch, serverTimestamp } = await import("firebase/firestore");
          const batch = writeBatch(db);
          unique.forEach((item) => {
            batch.set(doc(db, "users", uid, "portfolio", item.ticker), {
              ticker: item.ticker,
              shares: item.shares,
              addedAt: serverTimestamp(),
            });
          });
          await batch.commit();
        } catch {
          // localStorage backup already written above
        }
      }
    },
    [uid]
  );

  return { items, tickers, addItem, addTicker, removeTicker, setItems: setItemsBulk };
}
