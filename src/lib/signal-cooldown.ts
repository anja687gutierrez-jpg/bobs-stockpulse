"use client";

import { getFirebaseDb } from "@/lib/firebase";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function checkSignalCooldown(uid: string, ticker: string): Promise<boolean> {
  const db = await getFirebaseDb();
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, "users", uid, "signalCooldowns", ticker));
  return snap.exists() && snap.data()?.lastSent === todayKey();
}

export async function setSignalCooldown(uid: string, ticker: string): Promise<void> {
  const db = await getFirebaseDb();
  const { doc, setDoc } = await import("firebase/firestore");
  await setDoc(doc(db, "users", uid, "signalCooldowns", ticker), {
    lastSent: todayKey(),
  });
}
