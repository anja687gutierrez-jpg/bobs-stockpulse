# StockPulse Revenue Strategy & Monetization To-Do List

## Context

StockPulse is a fully functional stock analysis app (Next.js 16, Cloudflare Pages, Firebase Auth + Firestore) with zero monetization. It has real features that competitors charge $80-$468/year for — DCF modeling, AI chat, portfolio tracking, signal alerts, screenshot import. The goal is to turn this into a revenue-generating product targeting retail investors who are more active than they realize.

**No code yet.** This is the strategic roadmap.

---

## Competitive Positioning

| Competitor | Price | StockPulse Advantage |
|------------|-------|---------------------|
| Stock Analysis Pro | $80/yr | We have AI chat + DCF modeling |
| FinChat | $348/yr | We're 4x cheaper with similar AI features |
| Seeking Alpha | $299/yr | We have interactive projections, not just ratings |
| Morningstar | $249/yr | We have portfolio-aware AI, not just data |
| Koyfin | $468/yr | We're retail-friendly, not advisor-grade complex |

**Unique differentiators:**
1. Editable DCF with bull/bear/base scenarios
2. Portfolio screenshot import (OCR -> auto-add holdings)
3. AI chat that knows your full portfolio context
4. 3-5x cheaper than comparable tools

---

## Proposed Tier Structure

### Free Tier
- [ ] 3 stocks max in portfolio
- [ ] Basic quotes + news
- [ ] Limited stock comparison (2 stocks)
- [ ] No AI chat
- [ ] No signal alerts
- [ ] No email notifications
- [ ] No DCF / projections
- [ ] No screenshot import

### Pro Tier — $9.99/month or $79/year
- [ ] Unlimited portfolio
- [ ] AI chat (50 queries/day cap)
- [ ] Full DCF + 5-year projections (bull/bear/base)
- [ ] Signal alerts + earnings/dividend calendar
- [ ] Email notifications (daily summary, alerts)
- [ ] Portfolio screenshot import
- [ ] Unlimited stock comparison
- [ ] Priority on future features

---

## Revenue Targets

| Milestone | Paying Users | Monthly | Annual |
|-----------|-------------|---------|--------|
| Ramen profitable | 50 | $500 | $6,000 |
| Side income | 200 | $2,000 | $24,000 |
| Serious revenue | 500 | $5,000 | $60,000 |
| Full-time income | 1,000 | $10,000 | $120,000 |

API costs stay near $0 until ~500+ active users (Groq, FMP, Yahoo all have generous free tiers).

---

## To-Do List

### Phase 1: Pre-Build Strategy (Do First)
- [ ] **Decide final pricing** — $9.99/mo + $79/yr? Or different?
- [ ] **Define feature gates precisely** — which features are free vs pro (draft above, finalize)
- [ ] **Choose payment provider** — Stripe (most common), Lemonsqueezy (simpler tax handling), or Paddle
- [ ] **Pick a landing page strategy** — current app homepage, or separate marketing page?
- [ ] **Identify 5-10 target communities** — Reddit (r/stocks, r/investing, r/wallstreetbets), X/fintwit, Discord trading servers, Indie Hackers
- [ ] **Research App Store / compliance** — any SEC disclaimers needed for financial tools? ("not financial advice" etc.)

### Phase 2: Product Polish (Before Monetizing)
- [ ] **Add saved watchlists** — sticky feature that keeps users coming back
- [ ] **Add analysis history** — save past DCF runs, compare over time
- [ ] **Improve onboarding flow** — new user sees value in first 60 seconds
- [ ] **Add "share analysis" feature** — shareable links = organic growth
- [ ] **Mobile responsiveness audit** — retail investors use phones
- [ ] **Performance audit** — page load times, API response caching

### Phase 3: Payment Infrastructure
- [ ] **Integrate Stripe** (or chosen provider) — checkout, billing portal, webhooks
- [ ] **Add subscription status to Firestore** — `users/{uid}/subscription` doc
- [ ] **Build feature gating logic** — middleware/hook that checks tier before allowing access
- [ ] **Create upgrade prompts** — when free user hits a gate, show clear value prop + upgrade CTA
- [ ] **Handle edge cases** — failed payments, cancellations, downgrades, refunds
- [ ] **Add trial period?** — 7 or 14 day free Pro trial to reduce friction

### Phase 4: Launch & Distribution
- [ ] **Write launch post** — Indie Hackers, Product Hunt, relevant subreddits
- [ ] **Create demo video** — 60-second screen recording showing the "wow" moments
- [ ] **Set up basic analytics** — track signups, conversions, feature usage (Plausible or PostHog)
- [ ] **Email sequence for free users** — drip campaign showing Pro features they're missing
- [ ] **SEO basics** — "free DCF calculator", "AI stock analysis", "portfolio tracker" landing pages

### Phase 5: Iterate & Scale
- [ ] **Track which features drive conversions** — double down on those
- [ ] **Add affiliate program?** — referral discounts for users who bring others
- [ ] **Consider API cost monitoring** — set up alerts before hitting paid tiers on Groq/FMP
- [ ] **Explore additional data sources** — more signals, insider trading data, options flow
- [ ] **Consider mobile app** — if web traction proves demand

---

## Cost Structure (Keep Lean)

| Expense | Current Cost | At Scale (500+ users) |
|---------|-------------|----------------------|
| Cloudflare Pages | Free | Free |
| Firebase Auth | Free (< 50K users) | Free |
| Firestore | Free (< 50K reads/day) | ~$25/mo |
| Groq API | Free tier | ~$50-100/mo |
| FMP API | Free (250 calls/day) | $29/mo (starter) |
| Stripe | 2.9% + $0.30 per txn | ~$300/mo at $10K MRR |
| Domain | ~$12/yr | ~$12/yr |
| **Total** | **~$1/mo** | **~$500/mo** |

Margins: ~95% at scale. This is a high-margin SaaS.

---

## Open Questions
- Custom domain for StockPulse? (currently `bobs-stockpulse.pages.dev`)
- Keep "Bob's" in the name or rebrand?
- Annual-only billing to improve cash flow, or offer both monthly + annual?
- Free trial length: 7 days, 14 days, or no trial?

---

## Key Files (When Ready to Build)

| File | Purpose |
|------|---------|
| `src/context/AuthContext.tsx` | Add subscription tier to user context |
| `src/app/api/` | Add Stripe webhook + checkout endpoints |
| `src/hooks/` | Add `useSubscription` hook for feature gating |
| `src/components/` | Add upgrade prompts, pricing page |
| Firestore rules | Add subscription document access rules |
