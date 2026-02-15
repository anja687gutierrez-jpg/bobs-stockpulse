"use client";

import { useState, useEffect, useCallback } from "react";
import { getFirebaseDb } from "@/lib/firebase";

export interface PriceAlert {
  id: string;
  ticker: string;
  targetPrice: number;
  direction: "above" | "below";
  active: boolean;
  createdAt: Date | null;
  triggeredAt: Date | null;
}

export function useAlerts(uid: string | null) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);

  useEffect(() => {
    if (!uid) {
      setAlerts([]);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    (async () => {
      const db = await getFirebaseDb();
      const { collection, onSnapshot, query, where } = await import("firebase/firestore");
      const colRef = collection(db, "users", uid, "alerts");
      const q = query(colRef, where("active", "==", true));

      unsubscribe = onSnapshot(q, (snapshot) => {
        const items: PriceAlert[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ticker: data.ticker,
            targetPrice: data.targetPrice,
            direction: data.direction,
            active: data.active,
            createdAt: data.createdAt?.toDate() ?? null,
            triggeredAt: data.triggeredAt?.toDate() ?? null,
          };
        });
        setAlerts(items);
      });
    })();

    return () => unsubscribe?.();
  }, [uid]);

  const createAlert = useCallback(
    async (alert: { ticker: string; targetPrice: number; direction: "above" | "below" }) => {
      if (!uid) return;
      const db = await getFirebaseDb();
      const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
      await addDoc(collection(db, "users", uid, "alerts"), {
        ...alert,
        active: true,
        createdAt: serverTimestamp(),
        triggeredAt: null,
      });
    },
    [uid]
  );

  const triggerAlert = useCallback(
    async (alertId: string) => {
      if (!uid) return;
      const db = await getFirebaseDb();
      const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
      await updateDoc(doc(db, "users", uid, "alerts", alertId), {
        active: false,
        triggeredAt: serverTimestamp(),
      });
    },
    [uid]
  );

  const deleteAlert = useCallback(
    async (alertId: string) => {
      if (!uid) return;
      const db = await getFirebaseDb();
      const { doc, deleteDoc } = await import("firebase/firestore");
      await deleteDoc(doc(db, "users", uid, "alerts", alertId));
    },
    [uid]
  );

  return { alerts, createAlert, triggerAlert, deleteAlert };
}
