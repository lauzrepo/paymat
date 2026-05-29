# Paymat — Technical Overview

**Version:** 1.1
**Date:** May 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [System Architecture](#2-system-architecture)
3. [Backend](#3-backend)
4. [Database Design](#4-database-design)
5. [Service Layer](#5-service-layer)
6. [Frontend Applications](#6-frontend-applications)
7. [Multi-Tenancy Model](#7-multi-tenancy-model)
8. [Payment Infrastructure](#8-payment-infrastructure)
9. [Billing Engine](#9-billing-engine)
10. [Authentication & Authorization](#10-authentication--authorization)
11. [Email System](#11-email-system)
12. [AI Assistant — Mate](#12-ai-assistant--mate)
13. [Infrastructure & Deployment](#13-infrastructure--deployment)
14. [Security Posture](#14-security-posture)

---

## 1. Overview

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
- AI assistant (Mate) for natural-language queries and billing actions via Claude

---

## 2. System Architecture

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
│  │  assistant · webhooks · super-admin · invites        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  Service Layer                        │   │
│  │  billingService · stripeConnectService · emailService│   │
│  │  invoiceService · paymentService · auditLogService   │   │
│  │  assistantService                                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ node-cron    │  │ Stripe SDK   │  │ Resend SDK       │   │
│  │ (6AM UTC)    │  │              │  │                  │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Anthropic SDK  (claude-haiku-4-5 · tool use)         │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ Prisma ORM
┌────────────────────────▼────────────────────────────────────┐
│              PostgreSQL  (Railway.app)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Backend

### 3.1 Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 24.x (LTS) |
| Language | TypeScript | 5.9.3 |
| Framework | Express.js | 4.22.1 |
| ORM | Prisma | 5.22.0 |
| Database | PostgreSQL | 16.x |
| Payments | Stripe Node SDK | 21.0.1 |
| Email | Resend | 6.4.2 |
| Auth | jsonwebtoken (JWT) | 9.0.3 |
| Password hashing | bcrypt | 5.1.1 |
| Validation | express-validator, zod | 7.3.2 / 4.x |
| Logging | Winston | 3.19.0 |
| Scheduling | node-cron | 4.2.1 |
| Security | Helmet, cors, express-rate-limit | current |
| AI | Anthropic SDK (@anthropic-ai/sdk) | 0.98.x |

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

| Middleware | Responsibility |
|-----------|----------------|
| `resolveTenant` | Org resolution by header or subdomain |
| `authenticateToken` | JWT access token verification |
| `optionalAuth` | Non-blocking JWT check (public routes) |
| `requireRole` | Role-based access control |
| `authenticateSuperAdmin` | Super-admin JWT verification |
| `apiLimiter` | 100 req / 15 min per org |
| `paymentLimiter` | Tighter limit on payment endpoints |
| `asyncHandler` | Async route error propagation |
| `errorHandler` | Centralized error formatting |

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
| `feedbackController` | `GET/POST /feedback`, `GET/PUT /feedback/:id` | Member feedback submissions |
| `clientController` | `GET /client/me`, `GET /client/enrollments`, `GET /client/invoices/:id`, `POST /client/invoices/:id/initialize-payment` | Member self-serve portal API |
| `assistantController` | `POST /assistant/chat` | AI assistant chat endpoint |
| `webhookController` | `POST /webhooks/stripe` | Stripe event ingestion |
| `superAdminController` | `GET/POST/PUT /super-admin/organizations` | Platform-level org management |
| `inviteController` | `GET/POST/DELETE /super-admin/invites`, `GET /invites/verify/:token`, `POST /invites/redeem/:token` | Org onboarding invite flow |

### 3.5 Scheduled Jobs

A `node-cron` job fires daily at **06:00 UTC** and calls `billingService.generateDueInvoices()`, processing all organizations in a single run.

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
| `platformFeePercent` | Float | Per-org platform fee cut on charges |
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
| `invoiceNumber` | String (global unique) | Format: `INV-00001`, globally sequential |
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
Singleton wrapping all Stripe API calls.

**Key methods:**

| Method | Purpose |
|--------|---------|
| `createConnectAccount` | Provision an Express account |
| `createAccountOnboardingLink` | Generate Stripe-hosted onboarding URL |
| `createCustomer` | Create a Stripe customer on a connected account |
| `createPaymentIntent` | Create PaymentIntent for self-serve payment |
| `chargeCustomer` | Off-session charge against a saved card |
| `refundCharge` | Full or partial refund |
| `createSetupIntent` | Save a card without charging |
| `constructWebhookEvent` | Verify and parse Stripe webhook payload |

**Platform fee mechanics:**
The `application_fee_amount` is calculated as `round(amountCents × (feePercent / 100))` and passed to Stripe on every charge. Stripe deducts this from the connected account's payout and routes it to the platform account automatically. The platform never handles funds directly.

### 5.3 `emailService`
Wraps the Resend SDK. All emails are HTML with a consistent indigo-branded header/footer template.

**Transactional emails:**

| Function | Trigger | Recipient |
|----------|---------|-----------|
| `sendInvoiceGenerated` | Invoice created, no saved card | Contact or family billing email |
| `sendPaymentReceived` | Auto-charge or portal payment succeeded | Contact or family billing email |
| `sendPaymentFailed` | Auto-charge failed | Contact or family billing email |
| `sendPasswordReset` | Forgot password request | User email |
| `sendWelcome` | New org admin registered | Admin email |

All email calls are fire-and-forget — a failed email never blocks a billing transaction.

### 5.4 `invoiceService`
CRUD + business logic for invoices. Handles global `INV-XXXXX` numbering.

### 5.5 `paymentService`
Records payments from any source (Stripe auto-charge, portal self-pay, manual cash/check entry). Handles refund flow by calling `stripeConnectService.refundCharge` then updating the payment record.

### 5.6 `auditLogService`
Writes structured audit events for user actions. Events include `userId`, `ipAddress`, `userAgent`, and a `metadata` JSON blob.

### 5.7 `assistantService`
Implements the Mate AI assistant. See [Section 12](#12-ai-assistant--mate) for full detail.

---

## 6. Frontend Applications

All three frontend apps share the same stack:

| Technology | Purpose |
|-----------|---------|
| React 18 | UI framework |
| Vite | Build tool |
| TypeScript | Type safety |
| TanStack Query v5 | Server state management, caching, background refetch |
| React Router 6 | Client-side routing |
| Axios | HTTP client with JWT interceptors |
| Tailwind CSS | Utility-first styling |
| React Hook Form + Zod | Form validation |

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
- **Mate** — AI assistant chat interface
- **Billing** — Manual billing run trigger, Stripe subscription status, billing stats
- **Feedback** — Member feedback/issue submissions
- **Settings** — Organization profile, branding, Stripe Connect onboarding

**Auth:** JWT access + refresh tokens in `localStorage`. Axios request interceptor proactively refreshes the access token before expiry, with a fallback 401 handler for edge cases.

### 6.2 Client Portal (`/frontend`)

**Deployed at:** `portal.cliqpaymat.app/:orgSlug`

The member-facing self-serve portal. Multi-tenant by URL path — the `orgSlug` is extracted from the route and sent as `x-organization-slug` on every API call.

**Routes:**
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
4. Recipient clicks link → confirms validity
5. Recipient registers → creates User + Organization atomically
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

**Isolation guarantee:**
All Prisma queries include `organizationId: req.organization.id` in their `where` clauses. Cross-tenant data access is structurally prevented at the query level.

---

## 8. Payment Infrastructure

Paymat uses **Stripe Connect Express** as its payment infrastructure:

1. **Organizations receive payouts directly** — funds flow from cardholder → org's Stripe account. Paymat never holds or touches funds.
2. **Platform fee is automatic** — Stripe deducts the `application_fee_amount` from the org's payout and routes it to the platform account in the same transaction.

### 8.1 Account Lifecycle

```
Super admin creates org
  ↓
Admin hits "Connect Stripe" in Settings
  ↓
Backend calls stripe.accounts.create({ type: 'express' })
  ↓
Backend generates onboarding URL and redirects admin
  ↓
Merchant completes KYC/business info on Stripe-hosted flow
  ↓
stripe.accounts retrieve confirms chargesEnabled: true
  ↓
Org is ready to process payments
```

### 8.2 Customer & Card Management

Each paying entity (contact or family) has a **Stripe Customer** on the connected account (not the platform account). When a contact pays their first invoice via the portal, the PaymentIntent is created with `setup_future_usage: 'off_session'`, allowing the card to be saved for future automatic charges.

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

---

## 9. Billing Engine

The billing engine (`billingService.generateDueInvoices`) runs daily at 06:00 UTC and processes all active enrollments in a single run.

### 9.1 Billing Run Algorithm

```
1. Find all active enrollments where nextBillingDate <= today

2. For each enrollment:
   a. Count completed billing cycles
   b. If cycles >= program.maxBillingCycles → cancel enrollment, skip

3. Partition eligible enrollments:
   - Family-billed: contact has a family with a saved card
   - Individual-billed: everything else

4. For each family group:
   a. Sum all enrollment prices → totalAmount
   b. Create one Invoice with N line items (one per enrollment)
   c. Advance nextBillingDate for each enrollment
   d. Attempt auto-charge on family's saved card

5. For each individual enrollment:
   a. Create Invoice with one line item
   b. Send invoice generated email
   c. Advance nextBillingDate
   d. If contact has a saved card → attempt auto-charge

6. Mark sent/draft invoices past their dueDate as overdue

7. Return summary: { invoicesCreated, autoCharged, errors }
```

### 9.2 Billing Frequency

| Frequency | `nextBillingDate` advance |
|-----------|--------------------------|
| `monthly` | +1 calendar month |
| `weekly` | +7 days |
| `yearly` | +1 calendar year |
| `one_time` | `null` (no next billing) |

### 9.3 Family Billing Logic

When a family has a saved card, all active enrollments for family members are grouped into a **single invoice** with one line item per member. This avoids multiple charges to the family's card on the same billing date.

### 9.4 Error Isolation

Each family group and each individual enrollment is wrapped in its own `try/catch`. A failed charge for one member does not block processing of subsequent members.

---

## 10. Authentication & Authorization

### 10.1 JWT Strategy

Two-token pattern:
- **Access token** — 15 minute expiry, contains `{ userId, email, organizationId, role }`
- **Refresh token** — 7 day expiry, used to issue new access tokens silently

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
2. Backend generates UUID token, stores with 1-hour expiry
3. Determines reset URL based on request origin (admin vs. portal)
4. Sends password reset email via Resend
5. POST /auth/reset-password (token, newPassword)
6. Validates token not expired, hashes new password, clears token
```

---

## 11. Email System

**Provider:** Resend
**Templates:** HTML strings with inline styles

All emails share a consistent structure:
- Indigo-branded header bar
- Organization name in header
- Content body
- Footer with copyright

| Email | Trigger |
|-------|---------|
| Invoice generated | New invoice, no saved card on file |
| Payment received | Successful auto-charge or portal payment |
| Payment failed | Failed auto-charge; includes portal payment link |
| Password reset | Forgot password request |
| Welcome | New org admin registered |

---

## 12. AI Assistant — Mate

Mate is an AI-powered assistant built into the admin portal that lets organization admins query their data and take billing actions through a natural-language chat interface.

### 12.1 Architecture

Mate is implemented as a stateless request/response service. The admin frontend maintains the conversation history in React state and sends the full message array to the backend on each turn.

```
Admin browser
  │
  │  POST /api/assistant/chat
  │  { messages: [...full conversation history] }
  ↓
assistantController
  → authenticateToken (org-scoped JWT required)
  → validate: messages array, max 50 messages
  ↓
assistantService.chat(messages, organizationId, userId)
  ↓
Anthropic API  (claude-haiku-4-5, tool use enabled)
  ↔  tool calls → executeTool(name, input, organizationId, userId)
                    → Prisma queries scoped to organizationId
  ↓
Text reply returned to browser
```

The `organizationId` is extracted from the authenticated JWT — never from the conversation content. All tool calls are scoped to the authenticated organization at the query level.

### 12.2 Model & Configuration

| Parameter | Value |
|-----------|-------|
| Model | `claude-haiku-4-5` |
| Max tokens | 1,024 |
| Max tool iterations | 8 per request |
| Max conversation length | 50 messages |
| Prompt caching | Automatic (`cache_control: ephemeral`) |

**Prompt caching:** Both API calls (initial and each tool-use continuation) include automatic prompt caching. Once a conversation grows past Haiku 4.5's 4,096-token minimum threshold, all prior turns are read from cache at 10% of normal input token cost — reducing both latency and cost as conversations grow.

### 12.3 Tools

Mate has 16 tools covering read queries, write actions, and contact management:

| Tool | Type | Description |
|------|------|-------------|
| `get_revenue_summary` | Read | Total collected, outstanding balance, overdue count, recent payments |
| `search_invoices` | Read | Filter invoices by status or contact name |
| `search_contacts` | Read | Search by name/email, or list all |
| `get_payment_history` | Read | Recent payments, optionally filtered by contact |
| `get_invoice_details` | Read | Full invoice including line items and payments |
| `get_contact_enrollments` | Read | A contact's active program enrollments |
| `get_family_details` | Read | Family members, enrollments, and outstanding balance |
| `list_programs` | Read | Active programs with pricing |
| `create_contact` | Write | Create a new contact |
| `create_invoice` | Write | Create a new invoice for a contact or family |
| `send_invoice` | Write | Mark a draft invoice as sent and email it |
| `record_payment` | Write | Record a manual cash/check/bank payment |
| `void_invoice` | Write | Cancel an unpaid invoice |
| `create_enrollment` | Write | Enroll a contact in a program |
| `unenroll_contact` | Write | Cancel a contact's enrollment |
| `update_contact_status` | Write | Set a contact active or inactive |

All write actions are logged to `AuditLog` with action codes prefixed `ASSISTANT_*`.

### 12.4 Security & Tenant Isolation

- The assistant endpoint requires a valid org-scoped JWT
- `organizationId` is injected server-side from `req.organization.id` — never from message content
- Every tool executes `WHERE organizationId = ?` — Mate cannot read or modify another tenant's data
- The super-admin portal has no assistant route and no access to `/api/assistant/chat`
- Conversation history is held client-side and discarded on page navigation — no server-side session storage

---

## 13. Infrastructure & Deployment

### 13.1 Services

| Service | Provider | Purpose |
|---------|----------|---------|
| Backend API | Railway.app | Express server + cron |
| PostgreSQL | Railway.app | Primary database |
| Admin portal | Vercel | Static SPA hosting |
| Client portal | Vercel | Static SPA hosting |
| Super-admin portal | Vercel | Static SPA hosting |
| Email | Resend | Transactional email |
| Payments | Stripe | Connect platform |

### 13.2 Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Access token signing key |
| `JWT_REFRESH_SECRET` | Refresh token signing key |
| `SUPER_ADMIN_JWT_SECRET` | Super-admin token signing key |
| `STRIPE_SECRET_KEY` | Stripe platform secret key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `RESEND_API_KEY` | Resend email API key |
| `EMAIL_FROM` | Sender address |
| `APP_URL` | Admin portal base URL |
| `ALLOWED_ORIGINS` | Comma-separated CORS whitelist |
| `ANTHROPIC_API_KEY` | Anthropic API key for Mate assistant |

### 13.3 Deployment Flow

Railway auto-deploys on push to `main`. Prisma migrations run automatically via `prisma migrate deploy` in the build step.

Vercel auto-deploys each frontend app from its respective subdirectory on push to `main`.

---

## 14. Security Posture

### 14.1 Transport
All traffic over HTTPS. Helmet sets `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, and `Content-Security-Policy` headers.

### 14.2 Input Validation
All inbound request bodies are validated with `express-validator` before reaching controllers.

### 14.3 SQL Injection
Prisma's parameterized query builder is used exclusively. No raw SQL strings are constructed from user input.

### 14.4 CORS
`ALLOWED_ORIGINS` env var is parsed as a comma-separated whitelist. Requests from unlisted origins are rejected at the CORS middleware level.

### 14.5 Rate Limiting
- `apiLimiter` — 100 requests per 15 minutes per IP, applied globally
- `paymentLimiter` — tighter limit on payment initialization endpoints

### 14.6 Webhook Verification
Stripe webhooks are verified using `stripe.webhooks.constructEvent(rawBody, signature, secret)`. The raw body buffer is preserved before JSON parsing specifically for this purpose.

### 14.7 Password Storage
All passwords are hashed with `bcrypt` at cost factor 10 before storage. Password reset tokens are UUID v4 strings with a 1-hour expiry window.

### 14.8 Tenant Isolation
Every data query is scoped to `organizationId` from the middleware-resolved tenant, not from user-supplied input. A user cannot query data from another organization even with a valid JWT.

---

*Last updated May 2026.*
