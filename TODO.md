# TODO

## Current state

The project was originally built as a generic payment portal wrapping Helcim. It has been redirected toward a **member management + recurring billing SaaS** for small service businesses. The backend has a working multi-tenant foundation and auth system. The frontend (currently `frontend/`) is a generic payment UI that needs to be rebuilt around the new domain.

---

## Phase 1 — Foundation rebuild

### Project structure
- [x] Rename `frontend/` → `admin/`
- [ ] Scaffold `client/` as a new Vite + React app

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
- [ ] Run `prisma db push` and update seed (seed updated; needs DB to run)

### Backend — routes & controllers
- [x] `/api/contacts` — CRUD for contacts (admin/staff)
- [x] `/api/families` — CRUD for families (admin/staff)
- [x] `/api/programs` — CRUD for programs (admin/staff)
- [x] `/api/enrollments` — enroll/unenroll contacts in programs (admin/staff)
- [x] `/api/invoices` — create, list, mark paid, void (admin/staff)
- [x] `/api/payments` — process payment against invoice (admin + client)
- [ ] `/api/client/me` — client's own profile, enrollments, invoices
- [x] Remove or gut: subscriptions, payment-methods, GDPR routes

### Backend — auth
- [x] Role-based middleware (`requireRole('admin')`, `requireRole('client')`)
- [ ] Client invite flow — admin creates a client account linked to a Contact
- [ ] Client login returns only their own data

---

## Phase 2 — Admin portal (`admin/`)

### Layout & navigation
- [ ] Rebuild sidebar nav: Dashboard, Contacts, Families, Programs, Enrollments, Invoices, Payments, Settings

### Pages
- [ ] **Dashboard** — active members, revenue this month, overdue invoices, recent activity
- [ ] **Contacts** — list, search, filter by status; add/edit/deactivate contact
- [ ] **Contact detail** — profile, enrollments, invoice history, payment history
- [ ] **Families** — list; create family, assign contacts, billing email
- [ ] **Programs** — list; create/edit program (name, price, frequency, capacity)
- [ ] **Enrollments** — enroll a contact in a program; view all active enrollments
- [ ] **Invoices** — list with status filter; view invoice detail; mark as paid manually
- [ ] **Payments** — payment history; process a payment against an invoice
- [ ] **Settings** — organization branding (name, logo, primary color), timezone

---

## Phase 3 — Client portal (`client/`)

### Pages
- [ ] **Login** — client login (separate from admin)
- [ ] **My account** — name, contact info, family members
- [ ] **My enrollments** — active programs
- [ ] **Invoices** — outstanding and past invoices
- [ ] **Pay invoice** — Helcim.js card entry, pay outstanding balance
- [ ] **Payment history** — receipts

---

## Phase 4 — Billing automation

- [ ] Cron job (or scheduled function) to auto-generate invoices at billing cycle start
- [ ] Auto-charge saved card on file if present
- [ ] Overdue invoice detection and status update
- [ ] Email notifications — invoice generated, payment received, payment failed (requires email service)

---

## Phase 5 — Polish & launch prep

- [ ] Replace Helcim stub with real Helcim API calls
- [ ] Webhook handling for Helcim payment events
- [ ] Organization onboarding flow (sign up, create org, invite staff)
- [ ] Stripe-based billing for the platform itself (orgs pay Paige a monthly fee)
- [ ] Deployment setup (Railway or Render for backend, Vercel for frontends)
- [ ] Basic test coverage for services and critical API routes

---

## Deferred / future

- Class scheduling (days, times, capacity per session)
- Attendance tracking (check-in per class)
- Waitlists
- Discount codes / scholarship pricing
- Parent/guardian multi-child management
- SMS notifications
- Mobile app
