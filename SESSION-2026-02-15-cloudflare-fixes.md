# StockPulse Session — 2026-02-15: Cloudflare Worker Limits & FMP Rate Fixes

## Problem
After adding 55+ positions via screenshot extraction, the app showed $0 portfolio value, "Failed to fetch quote" errors, and empty metrics. Root causes:
1. **Cloudflare 50 subrequest limit** — `getQuotesBatch()` fired 10 parallel Yahoo calls per chunk; multiple chunks exceeded the limit
2. **FMP 429 rate limiting** — `useStock` fired 5 FMP calls in parallel, overwhelming FMP free tier
3. **No retry logic** — a single timeout or 429 killed entire batches
4. **No debounce** — rapid `setItems` from multi-screenshot processing triggered redundant re-fetches
5. **Stale deploys** — `next build` alone doesn't regenerate Cloudflare assets; must run `opennextjs-cloudflare build`

## Changes Made

### `src/lib/yahoo.ts` — Retry + smaller chunks
- Added `withRetry(fn, retries=2, baseDelay=500)` helper with exponential backoff
- Wrapped all Yahoo Finance calls (search, quote, getQuotesBatch) with retry
- Reduced chunk size from 10 → 5 parallel calls (stays under 50 subrequest limit)

### `src/hooks/usePortfolioValue.ts` — Sequential batching + debounce
- Sequential batch loop with 200ms delay between batches (was `Promise.all`)
- `fetchBatch` retries once after 1s on 5xx or network error
- 500ms debounce coalesces rapid `setItems` into single fetch
- Cache TTL increased from 60s → 5 minutes
- Batch size set to 25 symbols per Worker invocation

### `src/hooks/useStock.ts` — Sequential FMP + retry
- FMP calls now run sequentially with 300ms gaps (was 5 parallel `Promise.allSettled`)
- Client-side retry for 429s: up to 2 retries with 1.5s/3s backoff
- Yahoo quote fetches first (appears instantly), FMP metrics load after
- Error messages changed to "Currently loading data…" (was "Failed to fetch quote/data")

### `src/lib/fmp.ts` — Server-side 429 retry
- `fetchFmp` retries up to 3x with 1s/2s backoff on 429 responses

### `src/components/layout/PortfolioDropZone.tsx` — Screenshot cap
- Max 3 screenshots per upload (~60 tickers max)
- Amber warning when files are capped

### UI messages updated (3 files)
- `metrics/page.tsx`, `page.tsx`, `DCFEngine.tsx` — changed "FMP API key may not be configured" → "FMP may be rate-limited"

## Key Lesson: Cloudflare Deploy Pipeline
**`pnpm build` alone is NOT enough.** Must run the full pipeline:
```bash
pnpm build              # Next.js build → .next/
pnpm build:cloudflare   # opennextjs-cloudflare → .open-next/
npx wrangler deploy     # Upload worker + assets to Cloudflare
```
Skipping `build:cloudflare` means `wrangler deploy` pushes stale `.open-next/` assets. Static assets are cached with `s-maxage=31536000` (1 year), so new JS bundles only get served when their content-hashed filenames change — which only happens when `.open-next/` is regenerated.

## Files Modified (6)
| File | Lines changed |
|------|--------------|
| `src/lib/yahoo.ts` | +15 (withRetry, chunk 10→5) |
| `src/hooks/usePortfolioValue.ts` | ~40 rewritten (sequential, debounce, retry, cache) |
| `src/hooks/useStock.ts` | ~40 rewritten (sequential FMP, retry, new messages) |
| `src/lib/fmp.ts` | +8 (429 retry loop) |
| `src/components/layout/PortfolioDropZone.tsx` | +8 (3-screenshot cap, warning) |
| `src/app/metrics/page.tsx` | 1 line (message text) |
