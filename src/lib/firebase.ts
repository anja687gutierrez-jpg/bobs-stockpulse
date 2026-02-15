"use client";

import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

export async function getFirebaseApp(): Promise<FirebaseApp> {
  if (!_app) {
    const { initializeApp, getApps, getApp } = await import("firebase/app");
    _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return _app;
}

export async function getFirebaseAuth(): Promise<Auth> {
  if (!_auth) {
    const app = await getFirebaseApp();
    const { getAuth } = await import("firebase/auth");
    _auth = getAuth(app);
  }
  return _auth;
}

export async function getFirebaseDb(): Promise<Firestore> {
  if (!_db) {
    const app = await getFirebaseApp();
    const { getFirestore } = await import("firebase/firestore");
    _db = getFirestore(app);
  }
  return _db;
}
