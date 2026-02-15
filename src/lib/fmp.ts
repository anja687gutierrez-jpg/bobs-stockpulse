const FMP_BASE = "https://financialmodelingprep.com/stable";
const ALLOWED_ENDPOINTS = ["income-statement", "key-metrics", "cash-flow-statement", "balance-sheet-statement", "ratios"] as const;
type FmpEndpoint = (typeof ALLOWED_ENDPOINTS)[number];

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function isAllowedEndpoint(ep: string): ep is FmpEndpoint {
  return ALLOWED_ENDPOINTS.includes(ep as FmpEndpoint);
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
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`FMP API error: ${res.status}`);
  }
  const data = await res.json();
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}
