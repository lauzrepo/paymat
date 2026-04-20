# Billing & Payments Guide

This guide covers how Paymat's billing engine works, how payments are processed via Stripe Connect, and how to manage invoices and payment records.

---

## How Automatic Billing Works

Paymat runs a billing job every day at **6:00 AM UTC**. The job:

1. Queries all enrollments with `status = active` and `nextBillingDate <= today`
2. Generates an invoice for each due enrollment
3. Attempts to auto-charge any member with a saved payment method
4. Sends email notifications to the member (success or failure)
5. Advances each enrollment's `nextBillingDate` by one billing cycle

### Billing Frequencies

| Frequency | Next billing date advances by |
|-----------|-------------------------------|
| `weekly` | 7 days |
| `monthly` | 1 calendar month |
| `yearly` | 1 calendar year |
| `one_time` | No advance (enrollment ends after first bill) |

### Invoice Numbering

All invoices are assigned a globally unique number in the format **INV-00001**, incrementing sequentially. Invoice numbers never repeat or reset.

---

## Manual Billing

You can trigger billing manually at any time from **Admin → Billing → Run Billing Now**.

Use cases:
- Testing that your setup is working correctly
- Billing members outside the normal schedule (e.g., a new mid-month enrollment)
- Re-running billing after fixing a configuration issue

---

## Stripe Connect Integration

Paymat uses **Stripe Connect Express** to route payments directly to your bank account.

### How It Works

1. You connect your Stripe account during onboarding (Settings → Stripe Connect)
2. Stripe provisions an Express account for your organization
3. When a member pays an invoice, Stripe routes the charge to your connected account
4. Paymat collects a small platform fee from each transaction at the time of payment
5. You receive the remainder as a Stripe payout to your bank (typically 2 business days)

### Platform Fee

Paymat's platform fee is deducted automatically from each payment via Stripe's application fee mechanism. You never need to calculate or transfer it manually.

For current pricing and fee rates, see the [Pricing page](https://cliqpaymat.app/#pricing).

### Stripe Dashboard

You can access your Stripe Express dashboard directly from **Admin → Settings → Stripe Connect → Open Stripe Dashboard**. From there you can:

- View payout history
- Manage bank accounts
- View detailed transaction history
- Handle disputes

---

## Invoice Lifecycle

```
[Enrollment billing date arrives]
         ↓
     [draft]  ← invoice created
         ↓
      [sent]  ← invoice emailed to member
         ↓
  Auto-charge attempt (if card on file)
    ↙           ↘
[paid]        [overdue]  ← if payment fails or no card
                  ↓
         Member pays via portal
                  ↓
              [paid]
```

Invoices can also be **voided** at any point if they are no longer collectible.

---

## Invoice Actions

### Mark as Paid (Manual)

Use this when a member pays by cash, check, or bank transfer outside of Paymat. This records the payment internally without processing a Stripe charge.

1. Open the invoice
2. Click **Mark as Paid**
3. Enter the payment date
4. Optionally add a note (e.g., "Paid by cash at front desk")

### Void an Invoice

Voiding cancels the invoice. Use this for:
- Invoices created in error
- Courtesy waivers
- Duplicate invoices

Voided invoices remain in the system for audit purposes but are excluded from outstanding balance calculations.

---

## Refunds

Refunds are processed through Stripe and return funds to the member's original payment method.

### Processing a Refund

1. Go to **Payments** and open the payment record
2. Click **Refund**
3. Enter the refund amount (full or partial)
4. Confirm

Paymat issues the refund via Stripe. The original platform fee is also partially or fully reversed proportionally. Refunds typically appear in the member's account within **5–10 business days** depending on their bank.

### Partial Refunds

You can refund any amount up to the original payment amount. The invoice status is updated to reflect the partial payment (it may return to "sent" or "overdue" if the full amount hasn't been collected).

---

## Payment Methods

### Online Card Payments

Members can pay invoices online through their portal using any major credit or debit card (Visa, Mastercard, American Express, Discover). Stripe handles card tokenization — Paymat never stores raw card data.

### Saved Cards & Auto-charge

When a member saves a card in their portal, that card is stored as a Stripe Customer payment method. On the next billing cycle, Paymat automatically charges it using Stripe's off-session payment flow.

If auto-charge fails (e.g., card expired or insufficient funds):
- The invoice remains as **overdue**
- The member receives a **payment failed** email with a link to pay manually
- The admin sees the overdue invoice in the dashboard

### Manual Payments (Cash, Check, Bank Transfer)

Use **Mark as Paid** on the invoice to record offline payments. This updates the invoice status but does not initiate any Stripe transaction.

---

## Email Notifications

Paymat sends transactional emails for the following billing events:

| Event | Recipient |
|-------|-----------|
| Invoice generated | Member (or family billing email) |
| Payment succeeded | Member |
| Payment failed | Member |
| Feedback submitted | Organization admin |

Emails are sent via **Resend** and use your organization's name in the from/reply-to.

---

## Paymat Platform Subscription

In addition to the per-transaction fee, Paymat may charge a platform subscription fee for your organization. This is managed separately via Stripe Checkout.

- Go to **Admin → Billing** to view your subscription status
- Click **Manage Subscription** to access the Stripe Customer Portal
- Update payment method, download invoices, or cancel from there

### Subscription Statuses

| Status | Meaning |
|--------|---------|
| `trialing` | Free trial period; no charge yet |
| `active` | Subscription is current and paid |
| `past_due` | Payment failed; access may be restricted |
| `canceled` | Subscription ended |
| `inactive` | No subscription; contact support |

---

## Troubleshooting

### Billing ran but no invoices were generated

Check that:
1. Enrollments have `status = active`
2. `nextBillingDate` is today or earlier
3. The program is not deactivated

### Member's card keeps failing

Ask the member to log into their portal, remove the old card, and add a new one. Then use **Run Billing Now** to retry.

### Invoice shows as paid but money hasn't arrived

Check your Stripe Express dashboard (Settings → Stripe Connect → Open Dashboard). Stripe payouts typically arrive within 2 business days of a successful charge. If a payout is delayed, Stripe will email you with details.

### Duplicate invoices

Paymat's billing engine has deduplication logic to prevent double-billing, but if you see a duplicate, void the extra invoice immediately. Then contact support at **hello@cliqpaymat.app**.
