// Lightweight Firestore client that works on both Node.js and Cloudflare Workers.
// Uses the Firestore REST API with Google service account JWT auth.

const FIRESTORE_BASE = "https://firestore.googleapis.com/v1";

let _cachedToken: { token: string; expires: number } | null = null;

function base64url(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getAccessToken(): Promise<string> {
  if (_cachedToken && Date.now() < _cachedToken.expires - 60000) {
    return _cachedToken.token;
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyPem = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKeyPem) {
    // Local dev: try reading service-account.json
    try {
      const path = require("path");
      const fs = require("fs");
      const sa = JSON.parse(fs.readFileSync(path.join(process.cwd(), "service-account.json"), "utf8"));
      process.env.FIREBASE_CLIENT_EMAIL = sa.client_email;
      process.env.FIREBASE_PRIVATE_KEY = sa.private_key;
      process.env.FIREBASE_PROJECT_ID = sa.project_id;
      return getAccessToken();
    } catch {
      throw new Error("Missing FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY env vars");
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/datastore",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );

  // Import the private key and sign the JWT
  const pemBody = privateKeyPem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const keyBytes = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBytes = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(`${header}.${payload}`)
  );
  const signature = base64url(new Uint8Array(signatureBytes));
  const jwt = `${header}.${payload}.${signature}`;

  // Exchange JWT for access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  const tokenData = (await tokenRes.json()) as { access_token: string; expires_in: number };
  _cachedToken = {
    token: tokenData.access_token,
    expires: Date.now() + tokenData.expires_in * 1000,
  };
  return _cachedToken.token;
}

function getProjectId(): string {
  return process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";
}

function docPath(projectId: string, path: string): string {
  return `${FIRESTORE_BASE}/projects/${projectId}/databases/(default)/documents/${path}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function decodeFirestoreValue(val: any): any {
  if (val.stringValue !== undefined) return val.stringValue;
  if (val.integerValue !== undefined) return Number(val.integerValue);
  if (val.doubleValue !== undefined) return val.doubleValue;
  if (val.booleanValue !== undefined) return val.booleanValue;
  if (val.nullValue !== undefined) return null;
  if (val.timestampValue !== undefined) return val.timestampValue;
  if (val.mapValue) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj: Record<string, any> = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
      obj[k] = decodeFirestoreValue(v);
    }
    return obj;
  }
  if (val.arrayValue) {
    return (val.arrayValue.values || []).map(decodeFirestoreValue);
  }
  return val;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function decodeDocument(doc: any): { id: string; data: Record<string, any> } {
  const name: string = doc.name;
  const id = name.split("/").pop() || "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};
  for (const [k, v] of Object.entries(doc.fields || {})) {
    data[k] = decodeFirestoreValue(v);
  }
  return { id, data };
}

export interface FirestoreDoc {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
}

export async function listCollection(collectionPath: string): Promise<FirestoreDoc[]> {
  const token = await getAccessToken();
  const projectId = getProjectId();
  const url = docPath(projectId, collectionPath);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firestore list ${collectionPath} failed: ${err}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body = (await res.json()) as { documents?: any[] };
  if (!body.documents) return [];
  return body.documents.map(decodeDocument);
}

export async function getDocument(docPath_: string): Promise<FirestoreDoc | null> {
  const token = await getAccessToken();
  const projectId = getProjectId();
  const url = docPath(projectId, docPath_);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firestore get ${docPath_} failed: ${err}`);
  }

  return decodeDocument(await res.json());
}

// Re-export a simple interface matching what the cron route needs
export function getServerDb() {
  return {
    collection(name: string) {
      return {
        async get() {
          const docs = await listCollection(name);
          return { docs: docs.map((d) => ({ id: d.id, data: () => d.data })), size: docs.length };
        },
        doc(docId: string) {
          return {
            collection(subName: string) {
              return {
                async get() {
                  const docs = await listCollection(`${name}/${docId}/${subName}`);
                  return { docs: docs.map((d) => ({ id: d.id, data: () => d.data })), size: docs.length };
                },
              };
            },
          };
        },
      };
    },
  };
}
