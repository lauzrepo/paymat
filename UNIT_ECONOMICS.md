# Paymat — Unit Economics & Operational Costs

## Platform Fee (Your Revenue)
<!-- Charged on top of every payment processed through a connected org -->
- Current rate: `STRIPE_APPLICATION_FEE_PERCENT` (set in Railway env)
- Assumed rate for projections below: **2%**
- This is taken automatically by Stripe Connect on every charge

---

## Per-Transaction Cost (Stripe)
Every payment processed incurs:
| Fee | Rate |
|-----|------|
| Stripe processing | 2.9% + $0.30 per transaction |
| Stripe Connect platform fee (you keep) | 2% of transaction |
| Net cost to org per $100 charged | ~$2.90 + $0.30 = $3.20 |
| Net revenue to you per $100 charged | ~$2.00 |

> Stripe's fee is paid by the connected org (deducted from their payout), not by you.
> You only pay Stripe fees on your platform fee if you use Stripe Billing for your own subscription — not applicable here.

---

## Infrastructure Costs

### Current Stack (Free Tiers)
| Service | Plan | Free Tier Limit | Cost After |
|---------|------|----------------|------------|
| Railway | Hobby | $5/mo credit (covers small usage) | ~$10–20/mo per service |
| Vercel | Hobby | 100GB bandwidth, 6000 build mins/mo | Pro: $20/mo |
| Resend | Free | 3,000 emails/mo, 100/day | Pro: $20/mo (50k emails) |
| Neon / Railway Postgres | Free | 0.5GB storage, shared compute | $5–20/mo |
| Stripe | — | No monthly fee, per-transaction only | — |

### When Free Tiers Break Down
| Service | Trigger to upgrade | Approx orgs at that point |
|---------|--------------------|--------------------------|
| Railway (backend) | >$5/mo compute (~500MB RAM sustained) | ~20–40 active orgs |
| Railway (Postgres) | >0.5GB DB storage | ~50–100 orgs |
| Vercel | >100GB bandwidth/mo | ~200+ orgs (frontend is mostly static) |
| Resend | >3,000 emails/mo or >100/day | ~30–50 orgs running weekly billing |

---

## Revenue Projections

### Assumptions
| Variable | Value |
|----------|-------|
| Avg member monthly billing | $90 |
| Avg members per org | 30 |
| Avg monthly volume per org | $2,700 |

### Revenue per org/mo by platform fee rate
| Rate | Revenue per org/mo |
|------|--------------------|
| 0.5% | $13.50 |
| 1.0% | $27.00 |
| 1.5% | $40.50 |
| 2.0% | $54.00 |
| 2.5% | $67.50 |
| 3.0% | $81.00 |

### Orgs needed to clear $1,000/mo net (after ~$100 infra)
| Rate | Orgs needed |
|------|-------------|
| 0.5% | ~82 orgs |
| 1.0% | ~41 orgs |
| 1.5% | ~28 orgs |
| 2.0% | ~21 orgs |
| 2.5% | ~17 orgs |
| 3.0% | ~14 orgs |

### Break-even table at 0.5%
| Active Orgs | Monthly Volume | Your Revenue | Est. Infra | Net |
|-------------|---------------|--------------|------------|-----|
| 1 | $2,700 | $13.50 | $0 | $13.50 |
| 5 | $13,500 | $67.50 | $0 | $67.50 |
| 10 | $27,000 | $135 | $5–15 | ~$125 |
| 20 | $54,000 | $270 | $20–40 | ~$240 |
| 50 | $135,000 | $675 | $60–100 | ~$600 |
| 100 | $270,000 | $1,350 | $150–250 | ~$1,150 |
| 200 | $540,000 | $2,700 | $300–500 | ~$2,300 |
| 500 | $1,350,000 | $6,750 | $500–1,000 | ~$6,000 |

### Break-even table at 1.0%
| Active Orgs | Monthly Volume | Your Revenue | Est. Infra | Net |
|-------------|---------------|--------------|------------|-----|
| 1 | $2,700 | $27 | $0 | $27 |
| 5 | $13,500 | $135 | $0 | $135 |
| 10 | $27,000 | $270 | $5–15 | ~$260 |
| 20 | $54,000 | $540 | $20–40 | ~$515 |
| 50 | $135,000 | $1,350 | $60–100 | ~$1,270 |
| 100 | $270,000 | $2,700 | $150–250 | ~$2,500 |
| 500 | $1,350,000 | $13,500 | $500–1,000 | ~$12,800 |

### Break-even table at 1.5%
| Active Orgs | Monthly Volume | Your Revenue | Est. Infra | Net |
|-------------|---------------|--------------|------------|-----|
| 1 | $2,700 | $40.50 | $0 | $40.50 |
| 5 | $13,500 | $202.50 | $0 | $202.50 |
| 10 | $27,000 | $405 | $5–15 | ~$395 |
| 20 | $54,000 | $810 | $20–40 | ~$780 |
| 50 | $135,000 | $2,025 | $60–100 | ~$1,950 |
| 100 | $270,000 | $4,050 | $150–250 | ~$3,850 |
| 500 | $1,350,000 | $20,250 | $500–1,000 | ~$19,500 |

### Break-even table at 2.0%
| Active Orgs | Monthly Volume | Your Revenue | Est. Infra | Net |
|-------------|---------------|--------------|------------|-----|
| 1 | $2,700 | $54 | $0 | $54 |
| 5 | $13,500 | $270 | $0–5 | ~$265 |
| 10 | $27,000 | $540 | $5–15 | ~$530 |
| 20 | $54,000 | $1,080 | $20–40 | ~$1,050 |
| 50 | $135,000 | $2,700 | $60–100 | ~$2,620 |
| 100 | $270,000 | $5,400 | $150–250 | ~$5,200 |
| 500 | $1,350,000 | $27,000 | $500–1,000 | ~$26,200 |

> Infra costs stay very low relative to revenue — this is the advantage of the Stripe Connect model.
> You never touch the money; orgs get paid directly.

---

## When to Leave Free Tiers

### Railway → Paid
- **Trigger:** Backend memory/CPU consistently hitting limits, or DB >0.5GB
- **Estimated point:** ~20–30 active orgs
- **Cost to upgrade:** ~$20–40/mo (still negligible vs revenue)

### Vercel → Pro
- **Trigger:** >100GB bandwidth/mo or need team features
- **Estimated point:** ~100+ orgs (frontend is a lightweight SPA)
- **Cost:** $20/mo

### Resend → Pro
- **Trigger:** >3,000 emails/mo (billing emails fire per invoice per member)
- **Calculation:** 30 members × 30 orgs = 900 emails/billing run
- **Estimated point:** ~10 orgs running monthly billing will approach the 100/day cap
- **Cost:** $20/mo — upgrade this one early

### Postgres → Dedicated
- **Trigger:** >0.5GB storage or need connection pooling under load
- **Estimated point:** ~50 orgs
- **Options:** Railway Postgres paid (~$5–20/mo), Neon free tier (larger), Supabase

---

## Early Adopter Pricing

### Strategy — Founding Member Cohort
- **Slots:** First 10–20 orgs
- **Rate:** 0.5% for life (locked, never increases)
- **Standard rate after:** 2.0%
- **What you give up:** ~$40/mo per org vs standard rate (worth it for relationships + social proof)
- **What you get:** Case studies, referrals, direct product feedback, public advocates

### Cost of the discount
| Founding orgs | Your revenue/mo (0.5%) | If they paid 2% | You give up |
|---------------|----------------------|-----------------|-------------|
| 5 | $67.50 | $270 | $202.50/mo |
| 10 | $135 | $540 | $405/mo |
| 20 | $270 | $1,080 | $810/mo |

> At 10 founding orgs you give up $405/mo — a small price for 10 orgs that will refer others and validate the product.

### Suggested structure
- Cap publicly at **10 founding spots** (creates scarcity)
- Require a short onboarding call (you get feedback, they feel invested)
- Give founding members a badge/label in their portal ("Founding Member")
- Ask for a testimonial at 90 days

### Transition plan
- Once founding spots are filled, move to standard 2% rate
- Optional: introduce a middle tier (e.g. 1% for early growth orgs, slots 11–50)

| Cohort | Slots | Rate | Eligibility |
|--------|-------|------|-------------|
| Founding | 1–10 | 0.5% for life | First 10 to sign up |
| Early Growth | 11–50 | 1.0% for life | TBD |
| Standard | 51+ | 2.0% | Everyone after |

---

## Subscription Model (Optional — Future)
Instead of / in addition to the platform fee, you could charge orgs a SaaS fee:

| Tier | Price/mo | Included |
|------|----------|----------|
| Starter | $49/mo | Up to 50 members |
| Growth | $99/mo | Up to 200 members |
| Pro | $199/mo | Unlimited members |

Combined with a lower platform fee (e.g. 1%) this would give more predictable revenue.

---

## Variables to Update
- [ ] Actual `STRIPE_APPLICATION_FEE_PERCENT` rate
- [ ] Target avg members per org (depends on your niche)
- [ ] Target avg monthly billing per member
- [ ] Whether you add a SaaS subscription fee on top
