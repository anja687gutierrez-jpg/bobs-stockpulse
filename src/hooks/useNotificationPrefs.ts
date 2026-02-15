"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb } from "@/lib/firebase";
import type { NotificationPrefs } from "@/lib/types";

const DEFAULT_PREFS: NotificationPrefs = {
  emailAlerts: true,
  emailSummary: true,
  pushAlerts: true,
  signalAlerts: true,
  earningsAlerts: true,
  dividendAlerts: true,
};

export function useNotificationPrefs() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPrefs(DEFAULT_PREFS);
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    (async () => {
      const db = await getFirebaseDb();
      const { doc, onSnapshot } = await import("firebase/firestore");
      const userDoc = doc(db, "users", user.uid);

      unsubscribe = onSnapshot(userDoc, (snap) => {
        const data = snap.data();
        if (data?.notificationPrefs) {
          setPrefs({ ...DEFAULT_PREFS, ...data.notificationPrefs });
        }
        setLoading(false);
      });
    })();

    return () => unsubscribe?.();
  }, [user]);

  const updatePref = async (key: keyof NotificationPrefs, value: boolean) => {
    if (!user) return;
    setPrefs((prev) => ({ ...prev, [key]: value }));

    const db = await getFirebaseDb();
    const { doc, updateDoc } = await import("firebase/firestore");
    await updateDoc(doc(db, "users", user.uid), {
      [`notificationPrefs.${key}`]: value,
    });
  };

  return { prefs, loading, updatePref };
}
