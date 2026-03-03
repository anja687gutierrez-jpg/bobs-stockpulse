# StockPulse To-Do

## Immediate
- [ ] **Set up cron-job.org** — 3 external crons needed to hit `/api/cron/daily-check` with Bearer auth header:
  - `?mode=movers` at 14:00 UTC (9:00 AM ET) — market movers email
  - `?mode=morning` at 13:30 UTC (8:30 AM ET) — morning brief
  - `?mode=evening` at 21:30 UTC (4:30 PM ET) — evening scan
  - Required because CF Workers cron triggers don't reach OpenNext routes

## Email System
- [ ] Increase `MAX_SIGNAL_TICKERS` and `MAX_QUOTE_TICKERS` if Cloudflare Workers plan is upgraded (current: 5 signals, 15 quotes — capped due to 50 subrequest limit on free plan)
- [ ] Add Rob's full portfolio to Firestore (currently only first batch added)

## Monetization
- See `tasks/monetization-todo.md` for full strategy
