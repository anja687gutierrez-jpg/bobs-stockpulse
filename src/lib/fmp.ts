const FMP_BASE = "https://financialmodelingprep.com/stable";
const ALLOWED_ENDPOINTS = ["income-statement", "key-metrics", "cash-flow-statement", "balance-sheet-statement", "ratios"] as const;
type FmpEndpoint = (typeof ALLOWED_ENDPOINTS)[number];

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function isAllowedEndpoint(ep: string): ep is FmpEndpoint {
  return ALLOWED_ENDPOINTS.includes(ep as FmpEndpoint);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchFmpCalendar(
  calendar: "earnings-calendar" | "dividend-calendar",
  from: string,
  to: string
): Promise<any[]> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey || apiKey === "your_fmp_api_key_here") {
    throw new Error("FMP_API_KEY not configured");
  }

  const url = `${FMP_BASE}/${calendar}?from=${from}&to=${to}&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FMP calendar error: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchFmp(endpoint: FmpEndpoint, symbol: string) {
  const cacheKey = `${endpoint}:${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey || apiKey === "your_fmp_api_key_here") {
    throw new Error("FMP_API_KEY not configured");
  }

  const url = `${FMP_BASE}/${endpoint}?symbol=${symbol}&period=annual&limit=5&apikey=${apiKey}`;

  let res: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(url);
    if (res.status === 429 && attempt < 2) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      continue;
    }
    break;
  }
  if (!res || !res.ok) {
    throw new Error(`FMP API error: ${res?.status ?? "no response"}`);
  }
  const data = await res.json();
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}
