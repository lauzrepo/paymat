# Per-Organization Helcim Account Plan

## Context

If Helcim does not support sub-merchant routing (one master account → multiple bank accounts), each organization on the platform will need their own Helcim account. This document outlines the preferred seamless approach and a fallback.

---

## Preferred Approach — Programmatic Account Creation (Seamless)

Studios should never need to interact with Helcim directly. The goal:

1. Studio completes onboarding on Cliq Paymat (invite → slug → password)
2. We call Helcim's API in the background to create a merchant account for them
3. A **"Set up payouts"** button appears in their admin dashboard
4. Clicking it opens a Helcim-hosted onboarding page where the studio enters their bank account details and completes identity/business verification (KYC/KYB)
5. Once complete, Helcim notifies us via webhook — we mark the org as payment-ready
6. All future payments process through their Helcim account and deposit to their bank

This is the same model as Stripe Connect. Whether Helcim supports it depends on their partner API capabilities — see support ticket questions below.

---

## Support Ticket — Additional Questions for Helcim

Add the following to the support ticket:

> 4. Do you offer a merchant onboarding API that allows a platform to programmatically create merchant accounts on behalf of businesses?
> 5. Is there a hosted onboarding link (similar to Stripe Connect's account links) that we can redirect a business owner to for bank account setup and identity verification, without them needing to create a Helcim account manually?
> 6. If programmatic onboarding is supported, what information is required to create a merchant account via API (business name, address, EIN, etc.)?
> 7. Is there a webhook event we can listen to that fires when a sub-merchant completes bank account setup?

---

## What We Build (if Helcim supports programmatic onboarding)

### Database

Add to `Organization` model:

```prisma
helcimMerchantId     String?  @map("helcim_merchant_id")
helcimPayoutsStatus  String   @default("pending") @map("helcim_payouts_status")
// pending | active | incomplete
```

### Backend — Auto-create merchant on onboarding

In `inviteController.ts`, after the organization is created in `redeemInvite`:

```typescript
// Fire-and-forget merchant account creation
helcimService.createMerchantAccount({
  businessName: invite.orgName,
  contactName: invite.recipientName,
  email: invite.email,
}).then(({ merchantId }) => {
  prisma.organization.update({
    where: { id: organization.id },
    data: { helcimMerchantId: merchantId },
  });
}).catch((err) => logger.warn('[Helcim] merchant creation failed', err));
```

### Backend — Onboarding link endpoint

```
GET /api/settings/helcim-onboarding-link
```

Returns a Helcim-hosted URL the admin clicks to set up their bank account. Once they complete it, Helcim fires a webhook and we update `helcimPayoutsStatus` to `active`.

### Admin portal — Dashboard banner

Show a dismissible banner on the dashboard if `helcimPayoutsStatus !== 'active'`:

> ⚠️ **Payouts not configured** — You won't be able to accept payments until you set up your bank account.
> [Set up payouts →]

### Admin portal — Settings page

Under Settings → Payments:
- Status indicator: "Payouts active" (green) or "Setup required" (yellow)
- Button: "Set up payouts" or "Update bank account" → opens Helcim hosted link

---

## Fallback Approach — Manual Token Entry

If Helcim does not support programmatic account creation or hosted onboarding:

- Each studio signs up for Helcim independently at helcim.com
- They paste their Helcim API token into Settings → Payments in Cliq Paymat
- This is less seamless but still functional

Implementation for the fallback is straightforward:
- Add `helcimApiToken String?` to Organization schema
- Refactor `helcimService` to use per-org token instead of global config token
- Add token input field + save button to Settings page
- Add billing guard to skip orgs with no token configured

---

## Estimated Effort

| Scenario | Effort |
|---|---|
| Programmatic onboarding (preferred) | ~4 hours |
| Manual token entry (fallback) | ~2.5 hours |

---

## Next Step

Submit the support ticket to Helcim with the updated questions. Implementation approach is determined by their response.

---

## Alternative Payment Processors (if Helcim cannot support this)

If Helcim does not offer programmatic merchant onboarding or hosted bank setup, the following processors are known to support the seamless platform model we need. Each should be evaluated before committing to a migration.

---

### 1. Stripe Connect — Industry standard, highest capability

**What it supports:**
- Programmatic connected account creation via API
- Hosted onboarding link (`AccountLink`) for bank setup + KYC/KYB — no Stripe account needed by the studio
- Webhooks for onboarding completion (`account.updated`)
- Supports both "Express" accounts (Stripe-hosted, simple) and "Custom" accounts (fully white-labeled)
- Per-charge routing: specify `transfer_data.destination` on each payment to route funds to the connected account
- Automatic payouts to connected bank accounts on a configurable schedule
- Built-in dispute handling and 1099 tax form generation per connected account

**Fit for Cliq Paymat:** Excellent. Express accounts give studios a Stripe-hosted dashboard for payouts without needing to interact with our app for bank setup. Custom accounts are fully invisible to the studio.

**Pricing:** 0.25% + 25¢ per payout transfer on top of standard processing fees (2.9% + 30¢). Negotiable at volume.

**Migration effort:** High — Stripe uses a different card tokenization model (Stripe.js / Payment Intents) than Helcim. Full replacement of HelcimPay.js, helcimService, and billing logic. Estimated 2–3 days.

---

### 2. Adyen for Platforms — Enterprise-grade, most flexible

**What it supports:**
- Full sub-merchant onboarding API (create, verify, manage)
- Hosted KYC/KYB onboarding flow
- Per-transaction routing to sub-merchant accounts
- Automatic split payments (platform fee deducted, remainder sent to sub-merchant)
- Supports ACH, cards, and international payment methods

**Fit for Cliq Paymat:** Strong fit for a growing platform. More complex to integrate than Stripe but better suited for high-volume or international expansion.

**Pricing:** Interchange++ model, requires direct pricing agreement with Adyen. Generally competitive at scale but higher minimum monthly fees.

**Migration effort:** High. Adyen's API is powerful but more complex than Stripe. Estimated 3–5 days.

---

### 3. Payrix (now Worldpay for Platforms) — SaaS-focused

**What it supports:**
- Built specifically for SaaS platforms embedding payments
- Programmatic sub-merchant onboarding
- Hosted boarding links for bank/KYC setup
- Automatic platform fee splits on each transaction
- ACH and card support

**Fit for Cliq Paymat:** Good fit — designed for exactly this use case (SaaS platform collecting on behalf of sub-merchants).

**Pricing:** Requires a direct pricing agreement. Generally competitive with Stripe Connect.

**Migration effort:** Medium-high. Less documentation and community support than Stripe. Estimated 3–4 days.

---

### 4. Square for Developers (OAuth model)

**What it supports:**
- OAuth flow: each studio connects their existing Square account to Cliq Paymat
- Per-transaction routing via the connected account's access token
- Hosted Square checkout for card tokenization

**Fit for Cliq Paymat:** Partial fit. Studios need an existing Square account — not fully seamless. Better for businesses already using Square for in-person payments.

**Pricing:** Standard Square rates (2.6% + 10¢ card present, 2.9% + 30¢ online).

**Migration effort:** Medium. OAuth flow is well-documented but requires each studio to have a Square account.

---

## Recommendation Priority

| Processor | Seamless Onboarding | No External Account Needed | Migration Effort | Recommended |
|---|---|---|---|---|
| Stripe Connect | ✅ | ✅ | High | **First choice** |
| Adyen for Platforms | ✅ | ✅ | Very High | At scale |
| Payrix / Worldpay | ✅ | ✅ | High | Consider if Stripe pricing is an issue |
| Square OAuth | Partial | ❌ | Medium | Not recommended |
| Helcim (manual token) | ❌ | ❌ | Low | Last resort only |

**If Helcim cannot support this, migrate to Stripe Connect.** It is the most documented, most developer-friendly, and most widely adopted solution for exactly this platform model. The migration is significant but well-defined.

---

## Decision Tree

```
Helcim supports programmatic onboarding + hosted bank setup?
  ├── YES → Build on Helcim (see plan above)
  └── NO
        └── Migrate to Stripe Connect
              ├── Replace HelcimPay.js with Stripe.js / Payment Intents
              ├── Replace helcimService with stripeService (connected accounts)
              ├── Add Stripe Connect onboarding flow to admin portal
              └── Update billing cron to use Stripe payment methods
```
