# StockPulse To-Do

## Immediate
- [ ] **Set up cron-job.org** — external cron to hit `/api/cron/daily-check` daily at 22:30 UTC (2:30 PM PT) with Bearer auth header. Required for automatic daily emails. Without this, no emails are sent automatically.

## Email System
- [ ] Increase `MAX_SIGNAL_TICKERS` and `MAX_QUOTE_TICKERS` if Cloudflare Workers plan is upgraded (current: 5 signals, 15 quotes — capped due to 50 subrequest limit on free plan)
- [ ] Add Rob's full portfolio to Firestore (currently only first batch added)

## Monetization
- See `tasks/monetization-todo.md` for full strategy
