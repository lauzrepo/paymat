# Stripe Connect — New Environment Variables

These variables need to be added to your Railway backend environment and any local `.env` files.

---

## Backend (Railway)

### Required — new

| Variable | Description | Where to find |
|---|---|---|
| `STRIPE_CONNECT_WEBHOOK_SECRET` | Webhook signing secret for Connect events (from connected accounts) | Stripe Dashboard → Developers → Webhooks → your Connect endpoint → Signing secret |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (sent to portal frontend to init Stripe.js) | Stripe Dashboard → Developers → API keys → Publishable key |
| `STRIPE_APPLICATION_FEE_PERCENT` | Platform fee % taken on each charge (e.g. `0.5` = 0.5%). Set to `0` to skip. | Your choice |

### Already present — now required (remove `.optional()`)

| Variable | Note |
|---|---|
| `STRIPE_SECRET_KEY` | Was optional — now required. Validated at startup. |

### Now optional (kept for Helcim webhook transition period)

| Variable | Note |
|---|---|
| `HELCIM_API_TOKEN` | No longer used by billing or payment flows. Can be removed once Helcim webhook is decommissioned. |
| `HELCIM_WEBHOOK_SECRET` | Same as above. |

---

## Frontend — Portal (`frontend/`)

| Variable | Description |
|---|---|
| `VITE_STRIPE_PUBLISHABLE_KEY` | Not strictly needed — publishable key is now returned from the backend `initialize-payment` endpoint per org. No env var needed in the portal. |

> The portal receives the publishable key dynamically from the backend so it uses the correct key regardless of environment.

---

## Stripe Dashboard setup checklist

### 1. Enable Connect in your Stripe account
- Stripe Dashboard → Settings → Connect → Enable Connect

### 2. Set branding for Express onboarding
- Stripe Dashboard → Settings → Connect → Branding
- Add your platform name, logo, and brand colour so the Express onboarding page looks like Cliq Paymat

### 3. Create the Connect webhook endpoint
- Stripe Dashboard → Developers → Webhooks → Add endpoint
- URL: `https://api.cliqpaymat.app/webhooks/stripe-connect` (or your Railway URL)
- **Listen to events on: Connected accounts** (not your account)
- Events to select:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `account.updated`
  - `charge.refunded`
- Copy the signing secret → set as `STRIPE_CONNECT_WEBHOOK_SECRET`

### 4. Platform webhook (existing — verify these events are selected)
- URL: `https://api.cliqpaymat.app/webhooks/stripe`
- Events:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

---

## Notes

- The `STRIPE_PRICE_ID` variable is unchanged — it's still used for Paymat's own SaaS subscription checkout.
- `STRIPE_WEBHOOK_SECRET` is unchanged — it covers platform-level events only.
- Two separate webhook endpoints with two separate secrets is intentional — platform events and Connect events use different verification secrets.
