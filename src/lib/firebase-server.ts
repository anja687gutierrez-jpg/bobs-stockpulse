import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import path from "path";

let _app: App | null = null;
let _db: Firestore | null = null;

function getServerApp(): App {
  if (!_app) {
    if (getApps().length > 0) {
      _app = getApps()[0];
    } else {
      const serviceAccountPath = path.join(process.cwd(), "service-account.json");
      _app = initializeApp({
        credential: cert(serviceAccountPath),
      });
    }
  }
  return _app;
}

export function getServerDb(): Firestore {
  if (!_db) {
    _db = getFirestore(getServerApp());
  }
  return _db;
}
