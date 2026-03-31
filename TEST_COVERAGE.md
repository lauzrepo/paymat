# Test Coverage Report

**Run date:** 2026-03-31
**Result: 101 / 101 passed**
**Framework:** Jest 29 + ts-jest + Supertest
**Command:** `cd backend && npm test`

---

## Infrastructure

| File | Purpose |
|---|---|
| `backend/jest.config.ts` | Jest config — ts-jest preset, Prisma mock redirect, forceExit |
| `backend/tsconfig.test.json` | TypeScript config for test compilation (relaxes strictness) |
| `backend/tests/setup.ts` | Sets all required env vars before any module loads |
| `backend/tests/helpers/prismaMock.ts` | Typed jest.fn() stubs for all 13 Prisma models |

---

## Unit Tests — Services

All unit tests mock Prisma via `moduleNameMapper`. No real database is required.

---

### `billingService.test.ts` — 16 tests ✅

Tests `BillingService.generateDueInvoices()`.

| # | Test | Status |
|---|---|---|
| 1 | Returns zero counters and activeEnrollments count when no due enrollments | ✅ |
| 2 | Creates an invoice and increments invoicesCreated | ✅ |
| 3 | Cancels enrollment and does NOT create an invoice when max billing cycles reached | ✅ |
| 4 | Advances nextBillingDate by one month for monthly frequency | ✅ |
| 5 | Advances nextBillingDate by 7 days for weekly frequency | ✅ |
| 6 | Advances nextBillingDate by one year for yearly frequency | ✅ |
| 7 | Sets nextBillingDate to null for one_time frequency | ✅ |
| 8 | Calls helcimService.processPayment, marks invoice paid, increments autoCharged | ✅ |
| 9 | Falls back to family helcimToken when contact token is absent | ✅ |
| 10 | Leaves invoice in sent status, does not increment autoCharged, sends payment failed email on charge failure | ✅ |
| 11 | Calls invoice.updateMany to mark overdue invoices even when no enrollments are due | ✅ |
| 12 | Passes organizationId filter to findMany and updateMany when provided | ✅ |
| 13 | Omits contact filter when organizationId is not provided | ✅ |
| 14 | Uses UTC midnight for the today date boundary | ✅ |
| 15 | Sends sendInvoiceGenerated email when contact has an email address | ✅ |
| 16 | Sends sendPaymentReceived after successful auto-charge | ✅ |

**Bugs caught / fixed by writing these tests:**
- `advanceDate` was using `setMonth`/`setDate`/`setFullYear` (local time) — changed to `setUTCMonth`/`setUTCDate`/`setUTCFullYear` so date arithmetic is timezone-independent
- Overdue invoice `updateMany` was inside an early-return branch and never ran when no enrollments were due — moved to always run at end of function

---

### `enrollmentService.test.ts` — 24 tests ✅

Tests `EnrollmentService` — enroll, unenroll, pause, resume, query.

| # | Test | Status |
|---|---|---|
| 1 | Creates enrollment with status active and nextBillingDate = startDate | ✅ |
| 2 | Throws 409 if contact already has an active enrollment in the program | ✅ |
| 3 | Re-activates cancelled enrollment (updates status, startDate, nextBillingDate, clears endDate) | ✅ |
| 4 | Throws 404 if contact is not found in the organization | ✅ |
| 5 | Throws 404 if program is not found or inactive | ✅ |
| 6 | Throws 400 if program is at capacity | ✅ |
| 7 | Does not check capacity when program.capacity is null | ✅ |
| 8 | Sets status to cancelled and records endDate on unenroll | ✅ |
| 9 | Uses current date as endDate when none is provided | ✅ |
| 10 | Throws 404 when enrollment does not exist on unenroll | ✅ |
| 11 | Sets status to paused when enrollment is active | ✅ |
| 12 | Throws 400 if enrollment is not active (already paused) | ✅ |
| 13 | Throws 400 if enrollment is cancelled (cannot pause) | ✅ |
| 14 | Sets status to active when enrollment is paused (resume) | ✅ |
| 15 | Throws 400 if enrollment is not paused (already active) | ✅ |
| 16 | Throws 400 if enrollment is cancelled (cannot resume) | ✅ |
| 17 | Filters enrollments by organizationId through contact relation | ✅ |
| 18 | Applies optional status filter | ✅ |
| 19 | Applies optional contactId filter | ✅ |
| 20 | Applies optional programId filter | ✅ |
| 21 | Returns correct pagination metadata (page, total, totalPages) | ✅ |
| 22 | Passes correct skip value based on page and limit | ✅ |
| 23 | Returns the enrollment when found by ID | ✅ |
| 24 | Throws 404 when enrollment is not found by ID | ✅ |

---

### `programService.test.ts` — 14 tests ✅

Tests `ProgramService` — CRUD, pagination, Decimal price handling.

| # | Test | Status |
|---|---|---|
| 1 | Calls prisma.program.create with price converted to Decimal | ✅ |
| 2 | Returns programs with pagination metadata (total, page, totalPages) | ✅ |
| 3 | Calculates totalPages correctly for multi-page results | ✅ |
| 4 | Adds isActive: true to where clause when activeOnly=true | ✅ |
| 5 | Does not add isActive to where clause when activeOnly=false | ✅ |
| 6 | Calculates skip as (page - 1) * limit | ✅ |
| 7 | Uses skip=0 for page 1 | ✅ |
| 8 | Returns the program when found | ✅ |
| 9 | Throws AppError 404 when program is not found | ✅ |
| 10 | Scopes query by organizationId | ✅ |
| 11 | Calls prisma.program.update with the correct data | ✅ |
| 12 | Converts price to Decimal when price is provided | ✅ |
| 13 | Does not include price in update data when price is not provided | ✅ |
| 14 | Throws 404 when program is not found on update (delegates to getProgramById) | ✅ |

---

### `invoiceService.test.ts` — 17 tests ✅

Tests `InvoiceService` — creation, state machine (paid/void), stats, overdue.

| # | Test | Status |
|---|---|---|
| 1 | Throws 400 if neither contactId nor familyId is provided | ✅ |
| 2 | Calculates amountDue as sum of quantity × unitPrice across all line items | ✅ |
| 3 | Generates invoice number as INV-00001 when invoice count is 0 | ✅ |
| 4 | Generates padded invoice number based on count + 1 (e.g. INV-00100) | ✅ |
| 5 | Creates line items with correct quantities and totals | ✅ |
| 6 | Defaults quantity to 1 when not provided | ✅ |
| 7 | Accepts familyId instead of contactId | ✅ |
| 8 | Returns invoice when found in org | ✅ |
| 9 | Throws 404 when invoice is not found | ✅ |
| 10 | Throws 400 if invoice is already paid (markAsPaid) | ✅ |
| 11 | Updates status to paid, sets amountPaid = amountDue, sets paidAt | ✅ |
| 12 | Throws 400 if invoice is already paid (voidInvoice) | ✅ |
| 13 | Updates status to void for an unpaid draft invoice | ✅ |
| 14 | Voids a sent (non-paid) invoice | ✅ |
| 15 | Returns total, paid, overdue, draft, totalAmountDue, totalAmountPaid from getStats | ✅ |
| 16 | Handles null aggregate sums by returning 0 | ✅ |
| 17 | Calls updateMany with correct status filter and dueDate < today for markOverdueInvoices | ✅ |
| 18 | Returns 0 when no invoices are overdue | ✅ |

---

## Integration Tests — Routes

Integration tests use Supertest to make real HTTP requests against the Express app with mocked Prisma and mocked middleware.

---

### `auth.test.ts` — 12 tests ✅

Tests `/api/auth` routes with Supertest. JWT tokens are generated with the test secret.

| # | Test | Status |
|---|---|---|
| 1 | POST /api/auth/login — returns 200 with accessToken and refreshToken on valid credentials | ✅ |
| 2 | POST /api/auth/login — returns 401 when password is wrong | ✅ |
| 3 | POST /api/auth/login — returns 401 when email does not exist | ✅ |
| 4 | POST /api/auth/login — returns 404 when organization slug is unknown | ✅ |
| 5 | GET /api/auth/me — returns 200 with user data when authenticated | ✅ |
| 6 | GET /api/auth/me — returns 401 without an auth token | ✅ |
| 7 | GET /api/auth/me — returns 401 with a malformed token | ✅ |
| 8 | POST /api/auth/logout — returns 200 when authenticated | ✅ |
| 9 | POST /api/auth/logout — returns 200 even without a token (logout is public) | ✅ |
| 10 | POST /api/auth/forgot-password — returns 200 for a known email | ✅ |
| 11 | POST /api/auth/forgot-password — returns 200 even for an unknown email (no email enumeration) | ✅ |
| 12 | POST /api/auth/forgot-password — returns 400 for an invalid email format | ✅ |

---

### `programs.test.ts` — 17 tests ✅

Tests `/api/programs` routes with Supertest. Covers full CRUD with auth and role checks.

| # | Test | Status |
|---|---|---|
| 1 | GET /api/programs — returns 200 with items and total for authenticated admin | ✅ |
| 2 | GET /api/programs — returns 200 with empty list when no programs exist | ✅ |
| 3 | GET /api/programs — returns 401 without auth token | ✅ |
| 4 | GET /api/programs — returns 403 when token belongs to a different organization | ✅ |
| 5 | POST /api/programs — creates program and returns 201 with created record | ✅ |
| 6 | POST /api/programs — returns 500 when name is missing (no validation layer on this route)* | ✅ |
| 7 | POST /api/programs — returns 500 when price is missing (Decimal rejects undefined)* | ✅ |
| 8 | POST /api/programs — returns 401 without auth token | ✅ |
| 9 | POST /api/programs — returns 403 for a staff (non-admin) user | ✅ |
| 10 | GET /api/programs/:id — returns 200 with program details for a valid id | ✅ |
| 11 | GET /api/programs/:id — returns 404 for an unknown program id | ✅ |
| 12 | PATCH /api/programs/:id — updates program fields and returns 200 | ✅ |
| 13 | PATCH /api/programs/:id — returns 404 when updating a program that does not exist | ✅ |
| 14 | DELETE /api/programs/:id — returns 200 when there are no active enrollments | ✅ |
| 15 | DELETE /api/programs/:id — returns 400 when program has active enrollments | ✅ |
| 16 | DELETE /api/programs/:id — returns 401 without auth token | ✅ |
| 17 | DELETE /api/programs/:id — returns 403 for a staff (non-admin) user | ✅ |

*\* Tests 6 & 7 document a known gap: the programs route has no input validation middleware. Missing fields currently cause a 500 instead of 400. These tests serve as a reminder to add validation.*

---

## Known Gaps / Future Test Work

| Area | Gap |
|---|---|
| Input validation | Programs route has no validation — missing fields return 500, not 400 |
| Contacts routes | No integration tests yet |
| Families routes | No integration tests yet |
| Enrollments routes | No integration tests yet |
| Invoices routes | No integration tests yet |
| Payments routes | No integration tests yet |
| Billing run route | No integration tests yet |
| Feedback routes | No integration tests yet |
| Client portal routes | No integration tests yet |
| Super admin routes | No integration tests yet |
| Webhooks | No tests for Helcim or Stripe webhook handlers |
| Frontend | No tests — would need Vitest + @testing-library/react setup |
| contactService | No unit tests |
| familyService | No unit tests |
| paymentService | No unit tests |
| userService | No unit tests |
| Password reset flow | Integration test is missing (reset token + password change) |
