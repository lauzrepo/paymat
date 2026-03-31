# Test Coverage Report

**Run date:** 2026-03-31
**Backend Result: 271 / 271 passed** (19 suites)
**Frontend Result: 21 / 21 passed** (3 suites)
**Backend Framework:** Jest 29 + ts-jest + Supertest
**Frontend Framework:** Vitest + @testing-library/react
**Commands:** `cd backend && npm test` | `cd admin && npm test`

---

## Infrastructure

| File | Purpose |
|---|---|
| `backend/jest.config.ts` | Jest config — ts-jest preset, Prisma mock redirect, forceExit |
| `backend/tsconfig.test.json` | TypeScript config for test compilation (relaxes strictness) |
| `backend/tests/setup.ts` | Sets all required env vars before any module loads |
| `backend/tests/helpers/prismaMock.ts` | Typed jest.fn() stubs for all 13 Prisma models + $transaction |
| `admin/vitest.config.ts` | Vitest config — jsdom environment, @testing-library/jest-dom setup |
| `admin/src/test/setup.ts` | Imports @testing-library/jest-dom matchers |

---

## Unit Tests — Backend Services

All unit tests mock Prisma via `moduleNameMapper`. No real database is required.

---

### `billingService.test.ts` — 16 tests ✅

| # | Test |
|---|---|
| 1 | Returns zero counters when no due enrollments |
| 2 | Creates an invoice and increments invoicesCreated |
| 3 | Cancels enrollment when max billing cycles reached |
| 4 | Advances nextBillingDate by one month (monthly) |
| 5 | Advances nextBillingDate by 7 days (weekly) |
| 6 | Advances nextBillingDate by one year (yearly) |
| 7 | Sets nextBillingDate to null for one_time frequency |
| 8 | Calls helcimService.processPayment and marks invoice paid |
| 9 | Falls back to family helcimToken when contact token absent |
| 10 | Leaves invoice in sent status on charge failure, sends failed email |
| 11 | Calls invoice.updateMany for overdue even when no enrollments due |
| 12 | Passes organizationId filter when provided |
| 13 | Omits filter when organizationId not provided |
| 14 | Uses UTC midnight for the today boundary |
| 15 | Sends sendInvoiceGenerated when contact has email |
| 16 | Sends sendPaymentReceived after successful auto-charge |

---

### `enrollmentService.test.ts` — 24 tests ✅

| # | Test |
|---|---|
| 1–6 | Enrollment creation: active status, billing date, 409 duplicate, 404 contact/program, 400 capacity |
| 7 | No capacity check when program.capacity is null |
| 8–10 | Unenroll: cancelled status, endDate, 404 not found |
| 11–13 | Pause: sets paused, 400 already paused, 400 cancelled |
| 14–16 | Resume: sets active, 400 not paused, 400 cancelled |
| 17–22 | getEnrollments: org filter, status/contact/program filters, pagination |
| 23–24 | getEnrollmentById: found, 404 not found |

---

### `programService.test.ts` — 14 tests ✅

| # | Test |
|---|---|
| 1 | Creates program with Decimal price |
| 2–7 | getPrograms: pagination, totalPages, activeOnly filter, skip calculation |
| 8–10 | getProgramById: found, 404, org scope |
| 11–14 | updateProgram: correct data, Decimal price conversion, no price when absent, 404 |

---

### `invoiceService.test.ts` — 17 tests ✅

| # | Test |
|---|---|
| 1–7 | createInvoice: 400 no contact/family, amountDue sum, invoice number padding, line items, familyId support |
| 8–9 | getInvoiceById: found, 404 |
| 10–11 | markAsPaid: 400 already paid, updates paid status/amountPaid/paidAt |
| 12–14 | voidInvoice: 400 already paid, voids draft, voids sent |
| 15–16 | getStats: correct fields, null aggregate → 0 |
| 17–18 | markOverdueInvoices: correct filter, returns 0 when none |

---

### `paymentService.test.ts` — 21 tests ✅

| # | Test |
|---|---|
| 1–8 | processPayment: 404 invoice, 400 already paid, 400 void, manual payment, card payment, failed charge, creates payment record, updates invoice |
| 9–11 | getPayments: list, pagination, filters |
| 12–13 | getPaymentById: found, 404 |
| 14–18 | refundPayment: 404, 400 already refunded, helcim call, updates payment, updates invoice |
| 19–21 | getStats: total, succeeded sum, refunded sum |

---

### `contactService.test.ts` — 18 tests ✅

| # | Test |
|---|---|
| 1–4 | createContact: creates record, org scoped, optional fields, unique email check |
| 5–8 | getContacts: list, pagination, org scope, status filter |
| 9–10 | getContactById: found, 404 |
| 11 | updateContact |
| 12–13 | deactivateContact: sets inactive, cancels enrollments |
| 14–16 | permanentDeleteContact: 400 with invoices, 400 with payments, deletes cleanly |
| 17–18 | reactivateContact: sets active, 404 not found |

---

### `familyService.test.ts` — 8 tests ✅

| # | Test |
|---|---|
| 1 | createFamily |
| 2–5 | getFamilies: list, pagination, skip, org scope |
| 6 | getFamilyById: 404 |
| 7 | updateFamily |
| 8–9 | deleteFamily: 400 with contacts, deletes when empty |

---

### `userService.test.ts` — 12 tests ✅

| # | Test |
|---|---|
| 1–4 | createUser: bcrypt hash, role default, 409 duplicate, no passwordHash in response |
| 5–8 | authenticateUser: 404, soft-deleted 404, wrong password 401, success |
| 9–10 | getUserById: found (deletedAt:null filter), 404 |
| 11–12 | deleteUser: soft delete sets deletedAt, 404 |

---

## Integration Tests — Backend Routes

All tests use Supertest. Prisma is mocked via `moduleNameMapper`. Rate limiters bypassed. `__esModule: true` used for all ES module default export mocks (helcimService).

---

### `auth.test.ts` — 12 tests ✅

POST /login (valid, wrong password, unknown email, unknown org), GET /me (200, 401), POST /logout, POST /forgot-password (known, unknown, invalid email)

### `programs.test.ts` — 17 tests ✅

GET list (200, empty, 401, 403 wrong org), POST create (201, 401, 403 staff), GET by id (200, 404), PATCH update (200, 404), DELETE (200, 400 with enrollments, 401, 403 staff)

### `contacts.test.ts` — 16 tests ✅

GET list (200, 401), POST create (201, 401), GET by id (200, 404), PUT update (200), DELETE deactivate (200), DELETE permanent (204, 400 with invoices), POST reactivate (200), POST card/initialize (200), POST card/token (200, 400 missing token)

### `families.test.ts` — 14 tests ✅

GET list (200, 401), POST create (201, 401), GET by id (200, 404), PUT update (200, 404), DELETE (204, 400 with contacts, 401), POST card/initialize (200), POST card/token (200, 400)

### `enrollments.test.ts` — 13 tests ✅

GET list (200, 401), POST enroll (201, 401, 409 already enrolled), GET by id (200, 404), DELETE unenroll (200), DELETE force (200), POST pause (200), POST resume (200)

### `invoices.test.ts` — 12 tests ✅

GET list (200, 401), GET stats (200), POST create (201, 400 no contact, 401), GET by id (200, 404), POST mark-paid (200, 400 already paid), POST void (200, 400 paid)

### `payments.test.ts` — 11 tests ✅

GET list (200, 401), GET stats (200), GET by id (200, 404), POST process (201, 401), POST refund (200, 400 already refunded)

### `billing.test.ts` — 4 tests ✅

POST /run: 200 with admin JWT, 200 with BILLING_SECRET header, 401 without auth, 401 with wrong secret

### `feedback.test.ts` — 12 tests ✅

POST create (201, 400 missing name/subject/message, 400 invalid type, 401), GET list (200, 401), GET by id (200, 500 not found*), PATCH status (200, 400 invalid status)

*\* feedbackService.getById throws `Error` (not `AppError`) on missing — yields 500. Future: update service to throw AppError(404).*

### `client.test.ts` — 12 tests ✅

GET /me (200, 404 user not found, 401), GET /enrollments (200, empty without contactId), GET /invoices (200, empty without contactId), GET /invoices/:id (200, 403 no contact, 404), POST /invoices/:id/initialize-payment (200, 404), GET /payments (200)

### `superAdmin.test.ts` — 16 tests ✅

POST /auth/login (200, 400 missing fields, 401 wrong password, 401 not found), POST /auth/refresh-token (200, 400, 401 invalid), GET /auth/me (200, 401), GET /organizations (200, 401), POST /organizations (201, 401), GET /organizations/:id (200, 404), PATCH /organizations/:id/status (200)

---

## Frontend Unit Tests — Admin App

Framework: Vitest + @testing-library/react + jsdom

### `utils.test.ts` — 8 tests ✅

formatCurrency (USD, other currency), formatDate (readable format, non-empty), cn (joins classes, filters falsy, empty string, single class)

### `Button.test.tsx` — 6 tests ✅

Renders children, calls onClick, disabled prop, loading spinner + disabled, no click when disabled, variant class application

### `Badge.test.tsx` — 7 tests ✅

Renders children, default gray variant, green/red/yellow/blue variants, merges className

---

## Remaining Gaps

| Area | Gap |
|---|---|
| Input validation | Programs route has no validation middleware — missing fields return 500 not 400 |
| Webhooks | No tests for Helcim or Stripe webhook handlers |
| Password reset flow | No integration test for the full reset-token → password-change flow |
| feedbackService | getById throws generic Error instead of AppError(404) |
| Frontend pages | No tests for page-level components (Contacts, Invoices, etc.) |
