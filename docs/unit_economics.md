# Unit Economics

This document explains how Cliqpaymat generates revenue, how platform fees are structured and calculated, and what each transaction looks like from an economics standpoint.

---

## Revenue Model

Cliqpaymat earns revenue through a **per-transaction platform fee** deducted automatically from each payment processed via Stripe Connect. There is no flat monthly fee charged to organizations at the transaction level — revenue scales directly with payment volume.

A separate **platform subscription fee** may apply to the organization's Cliqpaymat account (see Admin → Billing), but this is independent of per-transaction economics.

---

## Platform Fee Tiers

Each organization is assigned a `platformFeePercent` at the time they are invited. This rate is locked in permanently and does not change as standard pricing evolves.

| Tier | Rate | Who Gets It |
|------|------|-------------|
| **Founding Member** | 0.05% | Soft-launch organizations — lowest rate ever offered, locked for life |
| **Early Adopter** | 1% | Limited cohort of early-growth organizations, locked for life |
| **Standard** | 2% | All new organizations after launch |

The default rate applied to new organizations is **2%** (stored as `platformFeePercent = 2.0` on the Organization record).

---

## Fee Calculation

The platform fee is applied at the moment of payment as a Stripe `application_fee_amount`. Cliqpaymat never invoices separately — the fee is deducted from the gross charge before the remainder is paid out to the organization.

```
platform_fee = payment_amount × (platformFeePercent / 100)
org_receives = payment_amount − platform_fee − stripe_fee
```

### Examples

| Payment Amount | Tier | Platform Fee | Stripe Fee (est.) | Org Receives (est.) |
|---------------|------|-------------|-------------------|---------------------|
| $100.00 | Standard (2%) | $2.00 | $3.20 | $94.80 |
| $100.00 | Early Adopter (1%) | $1.00 | $3.20 | $95.80 |
| $100.00 | Founding Member (0.05%) | $0.05 | $3.20 | $96.75 |
| $50.00 | Standard (2%) | $1.00 | $1.75 | $47.25 |
| $200.00 | Standard (2%) | $4.00 | $6.10 | $189.90 |

> Stripe fees shown are estimates based on the standard US card rate of 2.9% + $0.30. Actual Stripe fees vary by card type, country, and any negotiated rates.

---

## Stripe Fees

Stripe's fees are separate from Cliqpaymat's platform fee and are borne by the organization (deducted from payouts by Stripe directly). They are **not** collected by Cliqpaymat.

Typical Stripe Connect fees for US card payments:
- **2.9% + $0.30** per successful card charge
- Additional fees may apply for international cards, currency conversion, or disputes

Stripe's full fee schedule: [stripe.com/pricing](https://stripe.com/pricing)

---

## Revenue Per Transaction (Cliqpaymat)

Cliqpaymat's gross revenue from a single transaction:

```
cliqpaymat_revenue = payment_amount × (platformFeePercent / 100)
```

| Monthly Volume | Standard (2%) | Early Adopter (1%) | Founding (0.05%) |
|---------------|---------------|-------------------|-----------------|
| $5,000 | $100 | $50 | $2.50 |
| $10,000 | $200 | $100 | $5.00 |
| $25,000 | $500 | $250 | $12.50 |
| $50,000 | $1,000 | $500 | $25.00 |
| $100,000 | $2,000 | $1,000 | $50.00 |

---

## Payout Flow

```
Member pays invoice
        ↓
Stripe charges member's card
        ↓
Stripe deducts Stripe fee + Cliqpaymat application fee
        ↓
Remainder paid out to organization's connected bank account
(typically within 2 business days)
```

All fee deductions happen atomically at the Stripe level — organizations see the net payout amount in their Stripe Express dashboard.

---

## Setting an Organization's Fee Rate

Fee rates are assigned when an organization is invited via the Superadmin dashboard. The rate is stored on the `Organization` record and applied to every subsequent PaymentIntent.

To change an organization's rate after creation, update the `platformFeePercent` field via the Superadmin → Organization detail page.

---

## Related

- [Billing & Payments](billing-and-payments.md) — how invoices are generated and auto-charged
- [Getting Started](getting-started.md) — onboarding and Stripe Connect setup
