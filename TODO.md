# TODO

## Current state

Multi-tenant member management + recurring billing SaaS for small service businesses. Domain: `cliqpaymat.app` (live). Backend on Railway. `app.cliqpaymat.app` (admin), `admin.cliqpaymat.app` (super admin), `portal.cliqpaymat.app` (client portal). Resend verified. Phases 1–4 complete. Next: Phase 5 polish & launch prep.

---

## Phase 1 — Foundation rebuild ✅

### Project structure
- [x] Rename `frontend/` → `admin/`
- [x] Scaffold `client/` as a new Vite + React app (lives in `frontend/`)

### Backend — schema rewrite
- [x] Rename `Tenant` → `Organization`, add `type` and `timezone` fields
- [x] Add `role` field to `User` (`admin` | `staff` | `client`)
- [x] Add `Contact` model (member/student/client)
- [x] Add `Family` model (billing group for contacts)
- [x] Add `Program` model (service offering with price + billing frequency)
- [x] Add `Enrollment` model (links Contact to Program)
- [x] Redesign `Invoice` with line items per enrollment, tied to Family or Contact
- [x] Redesign `Payment` tied to Invoice
- [x] Remove `Subscription` model (replaced by Enrollment + Program)
- [x] Remove `PaymentMethod` model (handle via Helcim tokens on Contact)
- [x] Run `prisma db push` and update seed

### Backend — routes & controllers
- [x] `/api/contacts` — CRUD for contacts (admin/staff)
- [x] `/api/families` — CRUD for families (admin/staff)
- [x] `/api/programs` — CRUD for programs (admin/staff)
- [x] `/api/enrollments` — enroll/unenroll contacts in programs (admin/staff)
- [x] `/api/invoices` — create, list, mark paid, void (admin/staff)
- [x] `/api/payments` — process payment against invoice (admin + client)
- [x] `/api/client/*` — client-scoped endpoints (see Phase 3)
- [x] Remove or gut: subscriptions, payment-methods, GDPR routes

### Backend — auth
- [x] Role-based middleware (`requireRole('admin')`, `requireRole('client')`)
- [x] Client login returns only their own data (scoped via `/api/client/*`)
- [ ] Admin-side: create a client User account linked to an existing Contact

---

## Phase 2 — Admin portal (`admin/`) ✅

### Layout & navigation
- [x] Sidebar nav: Dashboard, Contacts, Families, Programs, Enrollments, Invoices, Payments, Settings

### Pages
- [x] **Dashboard** — active members, revenue this month, overdue invoices, recent activity
- [x] **Contacts** — list, search, filter by status; add/edit/deactivate contact
- [x] **Contact detail** — profile, enrollments, invoice history, payment history; save card on file via Helcim
- [x] **Families** — list; create family, assign contacts, billing email; save card on file via Helcim
- [x] **Family detail** — profile, members, card on file
- [x] **Programs** — list; create/edit program (name, price, frequency, capacity)
- [x] **Enrollments** — enroll a contact in a program; view all active enrollments
- [x] **Invoices** — list with status filter; create invoice with enrollment line items; record payment; void
- [x] **Invoice detail** — line items, payment history, refund, void
- [x] **Payments** — payment history; process a payment against an invoice
- [x] **Settings** — organization branding (name, logo, primary color), timezone

### Helcim integration
- [x] Card on file — save card via `appendHelcimPayIframe` on contact and family detail pages
- [x] Process payment against invoice (manual + card on file)
- [x] Recurring billing foundation via Helcim tokens stored on Contact/Family

---

## Phase 2.5 — Super admin portal (`superadmin/`) ✅

- [x] Separate JWT auth (`SuperAdmin` model, own secret keys)
- [x] Login page (live at `paymat.vercel.app`)
- [x] Organizations list with search + pagination
- [x] Organization detail — stats, settings editor, users list
- [x] Create organization — name, slug, type, timezone, first admin account
- [x] Activate / deactivate organization
- [x] Backend routes at `/super-admin/*` bypassing tenant resolution

---

## Phase 2.6 — Feedback & email ✅

### Feedback / issue submission
- [x] `FeedbackSubmission` model (type, subject, message, status, org + contact relation)
- [x] Backend routes: `POST /api/feedback` (any authed user), `GET/PATCH` (admin/staff)
- [x] Admin portal — Feedback list page with status/type filters + detail page with status updater
- [x] Client portal — Submit feedback/issue form + view past submissions

### Resend email integration
- [x] `emailService.ts` with Resend — feedback notification template + invite email template
- [x] Super admin receives email on every new feedback submission (fire-and-forget)
- [x] Env vars: `RESEND_API_KEY`, `SUPER_ADMIN_EMAIL`, `APP_URL`

### Customer invite & onboarding flow
- [x] `InviteToken` model (token, email, orgName, recipientName, expiresAt, usedAt)
- [x] Backend: `POST /super-admin/invites` (create + send email), `GET /super-admin/invites` (list)
- [x] Public endpoints: `GET /super-admin/invites/verify/:token`, `POST /super-admin/invites/redeem/:token`
- [x] Redeem creates organization + admin user in one transaction, marks token used
- [x] Super admin portal — Invites page: send form + sent invites table with Pending/Accepted/Expired badges
- [x] Admin portal — `/onboarding?token=` page: verify invite, set slug + password, create account, redirect to login

---

## Phase 3 — Client portal (`frontend/`) ✅

### Backend
- [x] `GET /api/client/me` — user profile + linked contact + family + active enrollments
- [x] `GET /api/client/enrollments` — all enrollments for the logged-in client
- [x] `GET /api/client/invoices` — invoices scoped to client's contactId / familyId
- [x] `GET /api/client/invoices/:id` — single invoice with ownership check
- [x] `POST /api/client/invoices/:id/initialize-payment` — init Helcim checkout for outstanding balance
- [x] `GET /api/client/payments` — payment history for client's invoices

### Pages
- [x] **Login** — client login (shared `/api/auth/login`, role-gated)
- [x] **Home** — welcome dashboard: active programs count, balance due, overdue alert, quick links
- [x] **My Account** — profile, contact info (phone, DOB), family name/billing email
- [x] **My Programs** — active and past enrollments with billing frequency + next billing date
- [x] **Invoices** — list with status badges; overdue highlighted; links to detail
- [x] **Invoice detail** — line items, paid/outstanding amounts, payment history, pay button (Helcim.js)
- [x] **Pay invoice** — HelcimPay.js iFrame card entry → submit token to `/api/payments`
- [x] **Payment History** — all payments across all invoices with status badges
- [x] **Support** — submit feedback/issue form + view past submissions

---

## Phase 4 — Billing automation ✅

- [x] Cron job — `node-cron` runs daily at 6am UTC, calls `billingService.generateDueInvoices()`
- [x] Auto-generate invoices for all active enrollments where `nextBillingDate <= today`
- [x] Auto-charge saved card on file (contact token → family token fallback)
- [x] Advance `nextBillingDate` after each billing cycle (monthly/weekly/yearly); clear for one_time
- [x] Overdue invoice detection — marks `draft`/`sent` invoices past due date as `overdue` on each run
- [x] Email — invoice generated (sent to contact when invoice is created)
- [x] Email — payment received (sent after successful auto-charge)
- [x] Email — payment failed (sent when auto-charge throws, with link to pay manually)
- [x] Manual trigger endpoint `POST /api/billing/run` (accepts `X-Billing-Secret` header for external callers)

---

## Phase 5 — Polish & launch prep

- [x] Webhook handling for Helcim payment events — HMAC verification, approved/failed/refunded handlers at `POST /webhooks/helcim`
- [x] Organization onboarding flow — invite email + guided setup via `/onboarding?token=`
- [x] Stripe-based billing for the platform itself — checkout link generation, customer portal, webhook sync of subscription status; admin Billing page shows status + portal link
- [x] Deployment setup (Railway for backend, Vercel for frontends)
- [ ] Basic test coverage for services and critical API routes
- [x] Custom domain `cliqpaymat.app` — all subdomains live, Railway env vars updated, Resend verified

---

## Deferred / future

- Class scheduling (days, times, capacity per session)
- Attendance tracking (check-in per class)
- Waitlists
- Discount codes / scholarship pricing
- Parent/guardian multi-child management
- SMS notifications
- Mobile app
