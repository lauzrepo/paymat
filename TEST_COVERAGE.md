# Test Coverage Report

**Run date:** 2026-03-31
**Backend Result: 276 / 276 passed** (19 suites)
**Frontend Result: 225 / 225 passed** (22 suites)
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
| `admin/src/test/renderWithProviders.tsx` | `renderWithProviders` + `mockQuery` + `mockMutation` helpers for page tests |
| `admin/tsconfig.app.json` | Excludes `__tests__` and `src/test` from production build |

---

## Unit Tests — Backend Services

All unit tests mock Prisma via `moduleNameMapper`. No real database is required.

---

### `billingService.test.ts` — 21 tests ✅

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
| 9 | Leaves invoice in sent status on charge failure, sends failed email |
| 10 | Calls invoice.updateMany for overdue even when no enrollments due |
| 11 | Passes organizationId filter when provided |
| 12 | Omits filter when organizationId not provided |
| 13 | Uses UTC midnight for the today boundary |
| 14 | Sends sendInvoiceGenerated when contact has email |
| 15 | Sends sendPaymentReceived after successful auto-charge |
| 16 | **Family grouping:** groups contacts by family when contact has familyId and family has helcimToken |
| 17 | **Family grouping:** charges the family helcimToken for grouped invoices |
| 18 | **Family grouping:** bills to billingEmail when family has one |
| 19 | **Family grouping:** falls back to individual billing when family has no helcimToken |
| 20 | **Family grouping:** creates separate invoices per family group |
| 21 | **Family grouping:** does not double-charge a contact also covered by family |

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

All page tests use `renderWithProviders` (MemoryRouter + QueryClientProvider), `mockQuery`, and `mockMutation` helpers. Hooks are fully mocked per-file; no real API calls are made.

---

### UI Components

#### `utils.test.ts` — 8 tests ✅

formatCurrency (USD, other currency), formatDate (readable format, non-empty), cn (joins classes, filters falsy, empty string, single class)

#### `Button.test.tsx` — 6 tests ✅

Renders children, calls onClick, disabled prop, loading spinner + disabled, no click when disabled, variant class application

#### `Badge.test.tsx` — 7 tests ✅

Renders children, default gray variant, green/red/yellow/blue variants, merges className

---

### Auth Pages

#### `LoginPage.test.tsx` — 9 tests ✅

Sign-in heading, workspace input with domain suffix, email/password inputs, Sign in button, Forgot password link, Register link, validation error without workspace, error on login failure, button disabled while pending, calls useLogin with form values

#### `RegisterPage.test.tsx` — 8 tests ✅

Create account heading, first/last name + email + password inputs, Create account button, Sign in link, inline required-field validation, error on registration failure, button disabled while pending, calls useRegister with form values

#### `ForgotPasswordPage.test.tsx` — 7 tests ✅

Reset password heading, email input, Send reset link button, Back to login link, success state (check email), button disabled while pending, error on failure, calls useForgotPassword with email

#### `ResetPasswordPage.test.tsx` — 8 tests ✅

Invalid/missing token error, form renders with token, Reset password button, success state (password updated), error on failure, button disabled while pending, passwords-don't-match validation, calls useResetPassword with token + password

#### `OnboardingPage.test.tsx` — 8 tests ✅

Loading state while verifying token, invalid state without token in URL, server error on failed verification, setup form after successful verification (auto-filled slug + email), password too short validation, passwords don't match validation, done state after successful creation, server error on failed creation

---

### Main Pages

#### `DashboardPage.test.tsx` — 9 tests ✅

Heading, stat cards (contacts/enrollments/invoices/payments), loading skeleton, error state, formatCurrency values, formatDate values

#### `ContactsPage.test.tsx` — 11 tests ✅

Heading, search input, status filter, Add contact button, contacts table, empty state, loading state, error state, pagination, search triggers refetch, status filter change

#### `FamiliesPage.test.tsx` — 10 tests ✅

Heading, Add family button, families table, empty state, loading state, error state, pagination, family name link, member count

#### `ProgramsPage.test.tsx` — 11 tests ✅

Heading, Add program button, programs table, empty state, loading state, capacity display (enrolled/max), billing frequency labels, pagination

#### `EnrollmentsPage.test.tsx` — 13 tests ✅

Heading, Enroll button, enrollments table, empty state, loading state, status filter, contact filter, program filter, pagination, status badge, unenroll action

#### `InvoicesPage.test.tsx` — 13 tests ✅

Heading, New invoice button, invoices table, empty state, loading state, status filter, pagination, invoice number link, amount due display, status badge

#### `PaymentsPage.test.tsx` — 9 tests ✅

Heading, payments table, empty state, loading state, payment method display, status badge, amount display, pagination

#### `FeedbackPage.test.tsx` — 13 tests ✅

Heading, feedback table, empty state, loading state, type filter, status filter, submission subject link, type label display, status badge

#### `BillingPage.test.tsx` — 13 tests ✅

Heading, stat cards (total/collected/outstanding/overdue), Run billing button, loading state, error state, billing run result display, Stripe subscription status

#### `SettingsPage.test.tsx` — 9 tests ✅

Loading returns null, org name display, branding fields, Save button, calls update with form values, error on failure, pending disabled state

---

### Detail Pages

#### `ContactDetailPage.test.tsx` — 13 tests ✅

Loading spinner, not found message, full name heading, active status badge, profile fields (email/phone), no card indicator, saved card indicator, no enrollments message, enrollments table with program name, no invoices message, invoices table with invoice number, Deactivate button for active contacts, Reactivate button for inactive contacts

#### `FamilyDetailPage.test.tsx` — 10 tests ✅

Loading spinner, not found message, family name heading, billing email, no card on file, saved card indicator, no members message, members table with contact name, Save card on file button, Delete button

#### `FeedbackDetailPage.test.tsx` — 10 tests ✅

Loading spinner, not found message, subject as heading, type label (Bug Report/Feedback/Question), status badge, submitter name, message body, status update dropdown, calls useUpdateFeedbackStatus on change, contact link when contact is present

#### `InvoiceDetailPage.test.tsx` — 15 tests ✅

Loading spinner, not found message, invoice number heading, status badge, amount due/paid/balance display, line items table, bill-to contact link, no payments message, payments table (method/status), Record payment + Void invoice buttons for actionable invoices, no action buttons for paid invoices, no action buttons for voided invoices, payment form opens on click, Refund button for succeeded payments, Download PDF button (lazy-loaded)

---

## Remaining Gaps

| Area | Gap |
|---|---|
| Input validation | Programs route has no validation middleware — missing fields return 500 not 400 |
| Webhooks | No tests for Helcim or Stripe webhook handlers |
| Password reset flow | No integration test for the full reset-token → password-change flow |
| feedbackService | getById throws generic Error instead of AppError(404) |
