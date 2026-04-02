# Paymat — Technical Whitepaper

**Version:** 1.0
**Date:** April 2026
**Status:** Internal / Pre-Publication

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Backend](#3-backend)
4. [Database Design](#4-database-design)
5. [Service Layer](#5-service-layer)
6. [Frontend Applications](#6-frontend-applications)
7. [Multi-Tenancy Model](#7-multi-tenancy-model)
8. [Payment Infrastructure](#8-payment-infrastructure)
9. [Billing Engine](#9-billing-engine)
10. [Authentication & Authorization](#10-authentication--authorization)
11. [Email System](#11-email-system)
12. [Infrastructure & Deployment](#12-infrastructure--deployment)
13. [Security Posture](#13-security-posture)
14. [Platform Economics](#14-platform-economics)

---

## 1. Executive Summary

Paymat is a multi-tenant SaaS platform purpose-built for small activity-based businesses — martial arts academies, swim schools, dance studios, gymnastics clubs — that need recurring billing and a member-facing payment portal without the complexity of enterprise software.

The platform is structured around three distinct user personas operating across four independent web applications:

| Persona | Application | Domain |
|---------|-------------|--------|
| Platform operator | Super-admin portal | `admin.cliqpaymat.app` |
| Organization admin | Admin portal | `app.cliqpaymat.app` |
| Member / parent | Client portal | `portal.cliqpaymat.app/:orgSlug` |
| (internal) | Backend API | `api.cliqpaymat.app` |

**Core capabilities:**
- Organization provisioning with Stripe Connect onboarding
- Contact and family group management
- Program definition with configurable billing cycles
- Automated invoice generation and auto-charging via saved cards
- Self-serve member payment portal with Stripe Elements
- Transactional email via Resend
- Per-organization platform fee with founding member discount support

---

## 2. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Clients                              │
│  superadmin.cliqpaymat.app  app.cliqpaymat.app              │
│  portal.cliqpaymat.app/:orgSlug                             │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────────────┐
│              Express API  (Railway.app)                     │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Tenant      │  │ Auth         │  │ Rate Limiter     │   │
│  │ Middleware  │  │ Middleware   │  │ (per-org)        │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  Route Controllers                    │   │
│  │  auth · contacts · families · programs · enrollments │   │
│  │  invoices · payments · billing · feedback · client   │   │
│  │  webhooks · super-admin · invites                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  Service Layer                        │   │
│  │  billingService · stripeConnectService · emailService│   │
│  │  invoiceService · paymentService · auditLogService   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ node-cron    │  │ Stripe SDK   │  │ Resend SDK       │   │
│  │ (6AM UTC)    │  │              │  │                  │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ Prisma ORM
┌────────────────────────▼────────────────────────────────────┐
│              PostgreSQL  (Railway.app)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Backend

### 3.1 Stack

| Layer | Technology | Version | LTS Status |
|-------|-----------|---------|------------|
| Runtime | Node.js | 22.x (LTS) | Active LTS until April 2027 |
| Language | TypeScript | 5.9.3 | Current stable |
| Framework | Express.js | 4.22.1 | Current stable (4.x) |
| ORM | Prisma | 5.22.0 | Current stable |
| Database | PostgreSQL | 16.x | LTS |
| Payments | Stripe Node SDK | 21.0.1 | Current stable |
| Email | Resend | 6.4.2 | Current stable |
| Auth | jsonwebtoken (JWT) | 9.0.3 | Current stable |
| Password hashing | bcrypt | 5.1.1 | Current stable |
| Validation | express-validator, zod | 7.3.2 / 3.25.76 | Current stable |
| Logging | Winston | 3.19.0 | Current stable |
| Scheduling | node-cron | 4.2.1 | Current stable |
| Security | Helmet, cors, express-rate-limit | 7.2.0 / 2.8.6 / 7.5.1 | Current stable |

### 3.2 Request Lifecycle

Every inbound HTTP request traverses the following middleware chain:

```
Helmet (security headers)
  ↓
CORS (origin whitelist from ALLOWED_ORIGINS env var)
  ↓
Raw body parser (webhook routes only — Stripe signature verification)
  ↓
JSON body parser (10MB limit)
  ↓
[super-admin routes branch off here — no tenant resolution]
  ↓
resolveTenant middleware
  → reads x-organization-slug header OR extracts subdomain from hostname
  → looks up organization in DB, attaches to req.organization
  ↓
Per-organization rate limiter (100 req / 15 min)
  ↓
Route handler
  ↓
asyncHandler (catches Promise rejections, forwards to error handler)
  ↓
errorHandler (formats AppError / unexpected errors into JSON response)
```

### 3.3 Middleware

| Middleware | File | Responsibility |
|-----------|------|----------------|
| `resolveTenant` | `middleware/tenant.ts` | Org resolution by header or subdomain |
| `authenticateToken` | `middleware/auth.ts` | JWT access token verification |
| `optionalAuth` | `middleware/auth.ts` | Non-blocking JWT check (public routes) |
| `requireRole` | `middleware/auth.ts` | Role-based access control |
| `authenticateSuperAdmin` | `middleware/superAdminAuth.ts` | Super-admin JWT verification |
| `apiLimiter` | `middleware/rateLimiter.ts` | 100 req / 15 min per org |
| `paymentLimiter` | `middleware/rateLimiter.ts` | Tighter limit on payment endpoints |
| `asyncHandler` | `middleware/errorHandler.ts` | Async route error propagation |
| `errorHandler` | `middleware/errorHandler.ts` | Centralized error formatting |

### 3.4 Controllers

| Controller | Routes | Purpose |
|-----------|--------|---------|
| `authController` | `POST /auth/login`, `/register`, `/logout`, `/refresh-token`, `/forgot-password`, `/reset-password` | User authentication lifecycle |
| `contactController` | `GET/POST /contacts`, `GET/PUT /contacts/:id` | Member CRUD |
| `familyController` | `GET/POST /families`, `GET/PUT/DELETE /families/:id` | Family group management |
| `programController` | `GET/POST /programs`, `GET/PUT /programs/:id` | Program/course management |
| `enrollmentController` | `GET/POST /enrollments`, `GET /enrollments/:id`, `POST /:id/unenroll`, `POST /:id/pause` | Enrollment lifecycle |
| `invoiceController` | `GET/POST /invoices`, `GET /invoices/:id`, `POST /:id/mark-paid`, `POST /:id/void`, `GET /invoices/stats` | Invoice management |
| `paymentController` | `GET/POST /payments`, `GET /payments/:id`, `POST /:id/refund`, `GET /payments/stats` | Payment recording & refunds |
| `billingController` | `POST /billing/run` | Trigger manual billing run |
| `stripeBillingController` | `GET /billing/status`, `POST /billing/portal` | Org Stripe subscription management |
| `feedbackController` | `GET/POST /feedback`, `GET/PUT /feedback/:id` | Member feedback submissions |
| `clientController` | `GET /client/me`, `GET /client/enrollments`, `GET /client/invoices`, `GET /client/invoices/:id`, `POST /client/invoices/:id/initialize-payment`, `GET /client/payments` | Member self-serve portal API |
| `webhookController` | `POST /webhooks/stripe` | Stripe event ingestion |
| `superAdminController` | `GET/POST/PUT /super-admin/organizations`, `GET /super-admin/auth/me` | Platform-level org management |
| `inviteController` | `GET/POST/DELETE /super-admin/invites`, `GET /invites/verify/:token`, `POST /invites/redeem/:token` | Org onboarding invite flow |

### 3.5 Scheduled Jobs

A `node-cron` job fires daily at **06:00 UTC** and calls `billingService.generateDueInvoices()` with no `organizationId` filter — processing all organizations in a single run. The run result is logged with counts of invoices created, auto-charges succeeded, and errors.

---

## 4. Database Design

**Engine:** PostgreSQL
**ORM:** Prisma 5.22.0
**Migrations:** Prisma Migrate (versioned, applied on deploy)

### 4.1 Entity Relationship Summary

```
SuperAdmin (platform operators)

Organization
  ├── User[] (admin/staff/client accounts)
  ├── Contact[]
  │     ├── Family? (belongs to)
  │     ├── Enrollment[]
  │     │     └── Program
  │     └── User? (portal account)
  ├── Family[]
  │     └── Contact[] (members)
  ├── Program[]
  ├── Invoice[]
  │     ├── Contact? (individual invoice)
  │     ├── Family? (family invoice)
  │     ├── InvoiceLineItem[]
  │     └── Payment[]
  ├── Payment[]
  ├── AuditLog[]
  └── FeedbackSubmission[]

InviteToken (org provisioning)
```

### 4.2 Key Models

#### Organization
The root entity. Every piece of data is scoped to an organization.

| Field | Type | Notes |
|-------|------|-------|
| `slug` | String (unique) | URL-safe identifier, used in portal routing |
| `stripeConnectAccountId` | String? | Stripe Express account for payouts |
| `platformFeePercent` | Float (default: 2.0) | Per-org platform fee cut on charges |
| `subscriptionStatus` | String | Platform subscription state |

#### Contact
Represents a member or athlete. May belong to a Family.

| Field | Type | Notes |
|-------|------|-------|
| `stripeCustomerId` | String? | Customer on the org's Connect account |
| `stripeDefaultPaymentMethodId` | String? | Saved card for auto-charge |
| `familyId` | String? | Links to a Family for grouped billing |

#### Family
A billing unit grouping multiple contacts. Has its own Stripe customer and saved card.

| Field | Type | Notes |
|-------|------|-------|
| `stripeCustomerId` | String? | Family-level Stripe customer |
| `stripeDefaultPaymentMethodId` | String? | Family's saved card |
| `billingEmail` | String? | Receives all invoices for the family |

#### Enrollment
The join between Contact and Program, tracking billing state.

| Field | Type | Notes |
|-------|------|-------|
| `nextBillingDate` | DateTime? | When the next invoice should generate |
| `status` | String | `active`, `paused`, `cancelled` |
| `maxBillingCycles` | Int? (on Program) | Auto-cancels after N invoices |

#### Invoice
Can be contact-level or family-level. Contains line items and zero or more payments.

| Field | Type | Notes |
|-------|------|-------|
| `invoiceNumber` | String (global unique) | Format: `INV-00001`, globally sequential across all orgs |
| `amountDue` | Decimal(10,2) | Total owed |
| `amountPaid` | Decimal(10,2) | Running paid total |
| `status` | String | `draft`, `sent`, `paid`, `overdue`, `void` |

#### Payment
Records every charge attempt, whether auto-charged or self-serve.

| Field | Type | Notes |
|-------|------|-------|
| `stripePaymentIntentId` | String? (unique) | Idempotency anchor |
| `stripeChargeId` | String? | Stripe charge reference |
| `status` | String | `succeeded`, `failed`, `refunded`, `pending` |
| `paymentMethodType` | String | `card`, `cash`, `check`, `bank_transfer`, `other` |

---

## 5. Service Layer

Services encapsulate all business logic. Controllers are thin — they validate input, call a service, and return the result.

### 5.1 `billingService`
The core billing engine. See [Section 9](#9-billing-engine) for full detail.

### 5.2 `stripeConnectService`
Singleton wrapping all Stripe API calls. Lazy-initializes the Stripe client on first use.

**Methods:**

| Method | Purpose |
|--------|---------|
| `createConnectAccount(orgId, orgName, email)` | Provision an Express account with `card_payments` + `transfers` capabilities |
| `createAccountOnboardingLink(accountId, returnUrl, refreshUrl)` | Generate onboarding URL for merchant |
| `createAccountLoginLink(accountId)` | Generate dashboard link for merchant |
| `getAccountStatus(accountId)` | Check `chargesEnabled` and `detailsSubmitted` |
| `createCustomer(connectAccountId, email, name)` | Create a Stripe customer on a connected account |
| `createPaymentIntent(connectAccountId, amountCents, currency, customerId, metadata, feePercent?)` | Create PaymentIntent for self-serve payment; applies org `platformFeePercent` as `application_fee_amount` |
| `chargeCustomer(opts)` | Off-session charge against a saved card; supports per-org `feePercent` |
| `refundCharge(connectAccountId, chargeId, amountCents?)` | Full or partial refund |
| `createSetupIntent(connectAccountId, customerId)` | Save a card without charging (returns `clientSecret`) |
| `constructWebhookEvent(rawBody, signature, secret)` | Verify and parse Stripe webhook payload |

**Platform fee mechanics:**
The `application_fee_amount` is calculated as `round(amountCents × (feePercent / 100))` and passed to Stripe on every charge. Stripe deducts this from the connected account's payout and routes it to the platform account automatically. The platform never handles funds directly.

### 5.3 `emailService`
Wraps the Resend SDK. All emails are HTML with a consistent indigo-branded header/footer template.

**Transactional emails:**

| Function | Trigger | Recipient |
|----------|---------|-----------|
| `sendInvoiceGenerated` | Invoice created, no saved card | Contact or family billing email |
| `sendPaymentReceived` | Auto-charge or portal payment succeeded | Contact or family billing email |
| `sendPaymentFailed` | Auto-charge failed | Contact or family billing email; includes portal payment link |
| `sendPasswordReset` | Forgot password request | User email; URL adapts to admin vs. portal origin |
| `sendWelcome` | New org admin registered | Admin email |

All email calls are fire-and-forget (`async/await` with `.catch()` logging) — a failed email never blocks a billing transaction.

### 5.4 `invoiceService`
CRUD + business logic for invoices. Handles global `INV-XXXXX` numbering by finding the current max and incrementing.

### 5.5 `paymentService`
Records payments from any source (Stripe auto-charge, portal self-pay, manual cash/check entry). Handles refund flow by calling `stripeConnectService.refundCharge` then updating the payment record.

### 5.6 `auditLogService`
Writes structured audit events for user actions (login, logout, invoice marked paid, etc.). Events include `userId`, `ipAddress`, `userAgent`, and a `metadata` JSON blob.

---

## 6. Frontend Applications

All three frontend apps share the same stack:

| Technology | Purpose |
|-----------|---------|
| React 18.3.1 | UI framework |
| Vite 5.4.10 | Build tool |
| TypeScript 5.6.2 | Type safety |
| React Query 5.91.3 (@tanstack/react-query) | Server state management, caching, background refetch |
| React Router 6.30.3 | Client-side routing |
| Axios 1.13.6 | HTTP client with JWT interceptors |
| Tailwind CSS 3.4.19 | Utility-first styling |
| React Hook Form 7.71.2 + Zod 4.3.6 | Form validation |

### 6.1 Admin Portal (`/admin`)

**Deployed at:** `app.cliqpaymat.app`

The primary interface for organization admins and staff.

**Pages:**
- **Dashboard** — Active member count, revenue this month, overdue invoices, invoice summary
- **Contacts** — Member list with search, status filter, pagination
- **Families** — Family group list, Stripe customer/card status
- **Programs** — Course catalog with pricing and billing frequency
- **Enrollments** — Member-to-program assignments, billing date tracking
- **Invoices** — Invoice list with status filters; mark-paid and void actions
- **Payments** — Payment history with refund capability
- **Billing** — Manual billing run trigger, Stripe subscription status, billing stats
- **Feedback** — Member feedback/issue submissions
- **Settings** — Organization profile, branding, Stripe Connect onboarding

**Auth store:** JWT access + refresh tokens in `localStorage`. Axios interceptor attaches `Authorization: Bearer <token>` on every request and auto-refreshes on 401.

### 6.2 Client Portal (`/frontend`)

**Deployed at:** `portal.cliqpaymat.app/:orgSlug`

The member-facing self-serve portal. Multi-tenant by URL path — the `orgSlug` is extracted from the route and sent as `x-organization-slug` on every API call.

**Routing:**
```
/:orgSlug/login
/:orgSlug/forgot-password
/:orgSlug/reset-password
/:orgSlug/                  → Home (dashboard)
/:orgSlug/account           → Profile
/:orgSlug/enrollments       → Active programs
/:orgSlug/invoices          → Invoice list
/:orgSlug/invoices/:id      → Invoice detail + payment form
/:orgSlug/payments          → Payment history
/:orgSlug/feedback          → Submit feedback
/:orgSlug/feedback/new
```

**Multi-tenancy implementation:**
```typescript
// OrgSlugContext provides slug to all components
function OrgRoutes() {
  const { orgSlug = '' } = useParams<{ orgSlug: string }>();
  useEffect(() => { setOrgSlug(orgSlug); }, [orgSlug]);
  return (
    <OrgSlugContext.Provider value={orgSlug}>
      <Routes>...</Routes>
    </OrgSlugContext.Provider>
  );
}

// Axios interceptor injects header on every request
if (currentOrgSlug) config.headers['x-organization-slug'] = currentOrgSlug;
```

**Payment flow:**
Invoice detail page calls `POST /api/client/invoices/:id/initialize-payment` → backend creates a Stripe PaymentIntent on the org's Connect account → returns `clientSecret` + `connectAccountId` + `publishableKey` → frontend renders Stripe Elements using those values → on success, backend webhook updates invoice status.

### 6.3 Super-Admin Portal (`/superadmin`)

**Deployed at:** `superadmin.cliqpaymat.app`

Platform operator tooling. Uses a separate JWT secret and auth flow — completely isolated from org-level auth.

**Pages:**
- **Organizations** — Full org list, create/edit/deactivate
- **Invites** — Generate invite tokens for new org onboarding, view/revoke pending invites

**Org onboarding flow:**
1. Super admin creates an invite (email + org name)
2. System generates a UUID invite token with expiry
3. Invite email sent to recipient
4. Recipient clicks link → `GET /super-admin/invites/verify/:token` confirms validity
5. Recipient registers → `POST /super-admin/invites/redeem/:token` creates User + Organization atomically
6. Admin completes Stripe Connect onboarding via the Settings page

---

## 7. Multi-Tenancy Model

Paymat uses a **shared database, shared schema** multi-tenancy model. Every table (except `SuperAdmin` and `InviteToken`) includes an `organizationId` foreign key. All queries are scoped by this key.

**Tenant resolution:**

The `resolveTenant` middleware runs on every request before route handlers:

```
1. Check x-organization-slug header → look up by slug
2. Extract subdomain from Host header → look up by slug
3. Fall back to DEFAULT_TENANT_SLUG env var (development only)
4. If not found → 404
```

This allows the same backend to serve all tenants simultaneously. The client portal uses the header approach (path-based slugs), while the admin portal uses the subdomain approach.

**Isolation guarantee:**
All Prisma queries in controllers include `organizationId: req.organization.id` in their `where` clauses. Cross-tenant data access is structurally prevented at the query level.

---

## 8. Payment Infrastructure

Paymat uses **Stripe Connect Express** as its payment infrastructure. This model has two key properties:

1. **Organizations receive payouts directly** — funds flow from cardholder → org's Stripe account. Paymat never holds or touches funds.
2. **Platform fee is automatic** — Stripe deducts the `application_fee_amount` from the org's payout and routes it to the platform account in the same transaction.

### 8.1 Account Lifecycle

```
Super admin creates org
  ↓
Admin hits "Connect Stripe" in Settings
  ↓
Backend calls stripe.accounts.create({ type: 'express', capabilities: { card_payments, transfers } })
  ↓
Backend generates accountLinks (onboarding URL) and redirects admin
  ↓
Merchant completes KYC/business info on Stripe-hosted flow
  ↓
stripe.accounts retrieve confirms chargesEnabled: true, detailsSubmitted: true
  ↓
Org is ready to process payments
```

### 8.2 Customer & Card Management

Each paying entity (contact or family) has a **Stripe Customer** created on the connected account (not the platform account). This is a critical distinction — the customer and their saved payment methods live under the org's Stripe account.

When a contact pays their first invoice via the portal:
1. A Stripe Customer is created on the org's Connect account
2. The PaymentIntent is created with `setup_future_usage: 'off_session'` (or Stripe auto-attaches via `automatic_payment_methods`)
3. After payment, the frontend can call the setup intent flow to explicitly save the card
4. The saved `paymentMethodId` is stored on the `Contact` record

### 8.3 Payment Intent Flow (Self-Serve Portal)

```
Member clicks "Pay Invoice"
  ↓
POST /api/client/invoices/:id/initialize-payment
  → Verify invoice belongs to this member/family
  → Get or create Stripe Customer on connected account
  → stripe.paymentIntents.create({ stripeAccount: connectAccountId, application_fee_amount })
  → Return { clientSecret, connectAccountId, publishableKey }
  ↓
Frontend initializes Stripe Elements with connectAccountId
  ↓
Member enters card → Stripe confirms PaymentIntent
  ↓
Stripe fires payment_intent.succeeded webhook
  ↓
Backend webhook handler updates invoice status → paid
```

### 8.4 Per-Organization Platform Fee

Each org has a `platformFeePercent` field (default: 2.0). This is passed to every charge:

```typescript
const appFee = rate > 0
  ? Math.round(amountCents * (rate / 100))
  : undefined;

// Applied as Stripe application_fee_amount
params.application_fee_amount = appFee;
```

Founding member orgs can have a lifetime rate of 0.5% set directly on their org record. Rate changes take effect on the next billing cycle with no code changes.

---

## 9. Billing Engine

The billing engine (`billingService.generateDueInvoices`) is the most complex component of the platform. It runs daily at 06:00 UTC and processes all active enrollments in a single transaction-safe loop.

### 9.1 Billing Run Algorithm

```
1. Find all active enrollments where nextBillingDate <= today
   (optionally scoped to a single organization)

2. For each enrollment:
   a. Count completed billing cycles (invoiceLineItem count)
   b. If cycles >= program.maxBillingCycles → cancel enrollment, skip

3. Partition eligible enrollments:
   - Family-billed: contact has a family AND family has stripeCustomerId + saved card
   - Individual-billed: everything else

4. For each family group:
   a. Sum all enrollment prices → totalAmount
   b. Create one Invoice with N line items (one per enrollment)
   c. Advance nextBillingDate for each enrollment
   d. Attempt auto-charge on family's saved card
      - On success: mark invoice paid, create Payment record, send payment received email
      - On failure: send payment failed email with portal link

5. For each individual enrollment:
   a. Create Invoice with one line item
   b. Send invoice generated email
   c. Advance nextBillingDate
   d. If contact has stripeCustomerId + saved card:
      - Attempt auto-charge
      - On success: mark paid, create Payment, send payment received email
      - On failure: send payment failed email with portal link

6. Mark all sent/draft invoices past their dueDate as overdue

7. Return summary: { invoicesCreated, autoCharged, errors }
```

### 9.2 Billing Frequency

| Frequency | `nextBillingDate` advance |
|-----------|--------------------------|
| `monthly` | +1 calendar month |
| `weekly` | +7 days |
| `yearly` | +1 calendar year |
| `one_time` | `null` (no next billing) |

### 9.3 Invoice Numbering

Invoice numbers are globally unique across all organizations (`INV-00001`, `INV-00002`, etc.). This is enforced by:
1. `@unique` constraint on `invoiceNumber` in the schema
2. `nextInvoiceNumber()` function that queries the current max and increments it

In high-concurrency scenarios this is a race condition risk — a future improvement would use a database sequence.

### 9.4 Family Billing Logic

When a family has a saved card, all active enrollments for family members are grouped into a **single invoice** with one line item per member. This avoids multiple charges to the family's card on the same billing date. The earliest `nextBillingDate` across the group is used as the invoice due date.

### 9.5 Error Isolation

Each family group and each individual enrollment is wrapped in its own `try/catch`. A failed charge for one member does not block processing of subsequent members. All errors are collected and returned in the run summary.

---

## 10. Authentication & Authorization

### 10.1 JWT Strategy

Two-token pattern:
- **Access token** — 15 minute expiry, contains `{ userId, email, organizationId, role }`
- **Refresh token** — 7 day expiry, stored in DB (`User.passwordResetToken` field is separate), used to issue new access tokens silently

Separate JWT secrets are used for org users vs. super-admins, ensuring super-admin tokens cannot be used on org routes and vice versa.

### 10.2 Role Hierarchy

| Role | Scope | Access |
|------|-------|--------|
| `superAdmin` | Platform | All organizations, invite management, org CRUD |
| `admin` | Organization | Full org data, billing runs, settings |
| `staff` | Organization | Read contacts/invoices/payments; no billing or settings |
| `client` | Self | Own invoices, enrollments, payments via client routes |

### 10.3 Password Reset Flow

```
1. POST /auth/forgot-password (email)
2. Backend generates UUID token, stores with 1-hour expiry on User record
3. Determines reset URL:
   - If request origin contains "portal." → /{orgSlug}/reset-password?token=...
   - Otherwise → /reset-password?token=...
4. Sends password reset email via Resend
5. POST /auth/reset-password (token, newPassword)
6. Validates token not expired, hashes new password, clears token
```

---

## 11. Email System

**Provider:** Resend
**SDK version:** 6.4.2
**From address:** Configured via `EMAIL_FROM` env var
**Templates:** HTML strings with inline styles (no templating engine dependency)

All emails share a consistent structure:
- Indigo (`#4f46e5`) branded header bar
- Organization name in header
- Content body
- Footer with copyright

**Rate limit consideration:** Resend's free tier caps at 100 emails/day and 3,000/month. At ~30 members per org, a single billing run for 10 orgs approaches the daily cap. Upgrade to Resend Pro ($20/mo) is recommended before onboarding more than 10 organizations.

---

## 12. Infrastructure & Deployment

### 12.1 Services

| Service | Provider | Purpose | Current Plan |
|---------|----------|---------|--------------|
| Backend API | Railway.app | Express server + cron | Hobby (~$5 credit/mo) |
| PostgreSQL | Railway.app | Primary database | Hobby (0.5GB) |
| Admin portal | Vercel | Static SPA hosting | Hobby (free) |
| Client portal | Vercel | Static SPA hosting | Hobby (free) |
| Super-admin portal | Vercel | Static SPA hosting | Hobby (free) |
| Email | Resend | Transactional email | Free (3k/mo) |
| Payments | Stripe | Connect platform | Per-transaction |

### 12.2 Environment Variables

**Backend (Railway):**

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Access token signing key |
| `JWT_REFRESH_SECRET` | Refresh token signing key |
| `SUPER_ADMIN_JWT_SECRET` | Super-admin token signing key |
| `STRIPE_SECRET_KEY` | Stripe platform secret key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (sent to frontend) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `STRIPE_APPLICATION_FEE_PERCENT` | Default platform fee (overridden per-org) |
| `RESEND_API_KEY` | Resend email API key |
| `EMAIL_FROM` | Sender address |
| `APP_URL` | Admin portal base URL |
| `ALLOWED_ORIGINS` | Comma-separated CORS whitelist |
| `DEFAULT_TENANT_SLUG` | Fallback tenant for local development |

### 12.3 Deployment Flow

Railway auto-deploys on push to `main`. The `railway.json` config specifies the build command (`npm run build`) and start command (`npm start`). Prisma migrations run automatically via a `prisma migrate deploy` step in the build.

Vercel auto-deploys each frontend app from its respective subdirectory on push to `main`.

### 12.4 Scaling Thresholds

| Service | Free tier limit | Approx org count at limit |
|---------|----------------|--------------------------|
| Railway compute | $5/mo credit | ~20–30 orgs |
| Railway Postgres | 0.5GB storage | ~50–100 orgs |
| Vercel bandwidth | 100GB/mo | ~200+ orgs (SPA is lightweight) |
| Resend | 100 emails/day | ~10 orgs on monthly billing |

---

## 13. Security Posture

### 13.1 Transport
All traffic over HTTPS. Helmet sets `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, and `Content-Security-Policy` headers.

### 13.2 Input Validation
All inbound request bodies are validated with `express-validator` before reaching controllers. `AppError` with appropriate HTTP status codes is thrown on invalid input.

### 13.3 SQL Injection
Prisma's parameterized query builder is used exclusively. No raw SQL strings are constructed from user input.

### 13.4 CORS
`ALLOWED_ORIGINS` env var is parsed as a comma-separated whitelist. Requests from unlisted origins are rejected at the CORS middleware level.

### 13.5 Rate Limiting
Two rate limiters:
- `apiLimiter` — 100 requests per 15 minutes per IP, applied globally
- `paymentLimiter` — tighter limit on payment initialization endpoints

### 13.6 Webhook Verification
Stripe webhooks are verified using `stripe.webhooks.constructEvent(rawBody, signature, secret)`. The raw body buffer is preserved before JSON parsing specifically for this purpose.

### 13.7 Password Storage
All passwords are hashed with `bcrypt` at cost factor 10 before storage. Password reset tokens are UUID v4 strings with a 1-hour expiry window.

### 13.8 Tenant Isolation
Every data query is scoped to `organizationId` from the middleware-resolved tenant, not from user-supplied input. A user cannot query data from another organization even with a valid JWT.

### 13.9 Known Limitations
- Invoice number generation (`nextInvoiceNumber`) is not atomic — concurrent billing runs could theoretically generate duplicate numbers (mitigated by the `@unique` constraint causing a retry-able conflict, but not handled gracefully yet)
- Refresh tokens are not stored server-side — revocation requires token expiry
- No MFA support yet

---

## 14. Platform Economics

### 14.1 Revenue Model
Paymat takes a percentage of every payment processed through the platform as a Stripe Connect application fee. This fee is:
- Configurable per organization via `Organization.platformFeePercent`
- Applied automatically by Stripe — no manual settlement required
- Invisible to the cardholder (they see only the org's charge)

### 14.2 Default & Early Adopter Rates

| Cohort | Rate | Orgs |
|--------|------|------|
| Founding members | 0.5% (lifetime) | First 10 |
| Early growth | 1.0% (lifetime) | Slots 11–50 |
| Standard | 2.0% | 51+ |

### 14.3 Revenue at Scale (2.0% rate, avg $2,700/org/mo)

| Active Orgs | Monthly Volume | Platform Revenue | Est. Infra | Net |
|-------------|---------------|-----------------|------------|-----|
| 10 | $27,000 | $540 | $15 | ~$525 |
| 25 | $67,500 | $1,350 | $40 | ~$1,310 |
| 50 | $135,000 | $2,700 | $100 | ~$2,600 |
| 100 | $270,000 | $5,400 | $250 | ~$5,150 |

Infrastructure costs remain under 5% of revenue at all realistic scales due to the Connect model — Paymat never processes or settles funds.

---

*This document reflects the system as of April 2026. Architecture decisions are subject to change as the platform scales.*
