# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (`cd backend`)
```bash
npm run dev          # Start dev server (nodemon, port 5000)
npm run build        # prisma generate + tsc
npm test             # Jest with coverage
npm run test:watch   # Jest watch mode
npm run test:integration   # Integration tests only
npx jest path/to/file.test.ts   # Single test file
npm run lint         # ESLint
npm run format       # Prettier
npm run prisma:migrate   # Create and run a new migration (dev)
npm run prisma:deploy    # Apply migrations (production)
npm run prisma:studio    # Open Prisma Studio
npm run prisma:seed      # Seed super admin + demo org
npm run prisma:reset     # Drop and recreate DB (dev only)
```

### Frontend apps (`cd admin` | `cd frontend` | `cd superadmin` | `cd landing`)
```bash
npm run dev          # Vite dev server
npm run build        # Type-check + Vite build
npm test             # Vitest (run once)
npm run test:watch   # Vitest watch
npm run test:e2e     # Playwright
npm run lint         # ESLint
```

## Architecture

### Multi-app structure
Five separate packages share no code — each has its own `node_modules` and must be installed and run independently:

| Package | Role | Default port |
|---|---|---|
| `backend/` | Express API | 5000 |
| `admin/` | Business owner/staff portal | 5173 |
| `frontend/` | Member/client portal | 5174 |
| `superadmin/` | Platform operator portal | 5175 |
| `landing/` | Marketing page | — |

### Multi-tenancy
Every API request is resolved to an `Organization` by the `resolveTenant` middleware (`backend/src/middleware/tenant.ts`). Resolution priority: `x-organization-slug` request header → subdomain of `req.hostname` → `DEFAULT_TENANT_SLUG` env var (local dev). All data is scoped by `organizationId` — never query across tenants.

### Request lifecycle
```
Request → resolveTenant (sets req.organization)
        → authenticateToken (sets req.user, validates organizationId matches)
        → requireRole('admin' | 'staff' | 'client')
        → Controller → Service → Prisma → PostgreSQL
```

### Auth
JWT with short-lived access tokens (15 min) and long-lived refresh tokens (7 days). Three separate JWT secret pairs: admin/staff users, client (member portal) users, and super admins each use different secrets and separate auth middleware. Roles are embedded in the token payload.

### Payments
Stripe Connect — each org has its own connected Stripe account (`stripeConnectAccountId`). The platform takes a configurable `platformFeePercent` cut via Stripe's `application_fee_amount`. Orgs start in `sandboxMode` (Stripe test keys); a super admin promotes them to live. Card data never touches the backend — Stripe.js handles it in the browser.

### Billing engine
`billingService.generateDueInvoices(organizationId)` runs on a cron schedule and on-demand via Mate. It queries enrollments where `nextBillingDate <= now`, generates invoices, attempts auto-charge via Stripe if the contact/family has a saved `stripeDefaultPaymentMethodId`, then advances `nextBillingDate` by the program's `billingFrequency`.

### Data model summary
- `Organization` → `Contact` (individual members) and `Family` (billing group)
- `Contact` optionally belongs to a `Family`; billing falls back to `Family.stripeDefaultPaymentMethodId`
- `Program` defines a service with price + billing frequency
- `Enrollment` links a `Contact` to a `Program` (statuses: `active`, `paused`, `cancelled`)
- `Invoice` → `InvoiceLineItem[]`; scoped to either a `Contact` or `Family`
- `Payment` → recorded against an `Invoice` (card via Stripe, or manual cash/check/etc.)
- `User` → portal account linked 1:1 to a `Contact` (client role) or standalone (admin/staff role)
- `MemberPortalInvite` → token-based invite flow for onboarding clients to the member portal
- `SuperAdmin` uses a separate table and JWT secret

### Mate (AI assistant)
`backend/src/services/assistantService.ts` — an agentic loop (max 8 iterations) using `claude-haiku-4-5` with ~30 tools for querying and mutating data. Destructive actions log to `AuditLog`. The assistant is only available to admin/staff users via `POST /api/assistant/chat`.

### Frontend patterns
All frontends use: React + React Router v7, TanStack Query for server state, Axios for API calls, Tailwind CSS v4, and Zod for form validation via react-hook-form. UI components live in `src/components/ui/`, shared cross-page logic in `src/components/shared/`, and page-level state is kept in the page component itself.

### Testing
- Backend: Jest + Supertest integration tests in `backend/tests/integration/`, unit tests in `backend/tests/unit/services/`. Prisma is mocked via `backend/tests/helpers/prismaMock.ts`.
- Frontend (admin): Vitest + Testing Library in `__tests__/` co-located with pages. Playwright for E2E.

## Planned Feature: Class Booking

**Status: not yet implemented.** Design is finalised — ready to build.

### Concept
A class pack model for personal trainers and studios. Members self-book into scheduled sessions, limited by the number of classes included in their enrolled program (e.g. a "12-class pack"). Standard recurring memberships with `maxClasses = null` have unlimited bookings.

Billing is unchanged — a class pack is just a `Program` with `billingFrequency: one_time` and `maxClasses: 12`. Existing invoicing and payment flows apply as-is.

### Schema changes

**`programs`** — add two columns:
- `max_classes: int?` — if set, this program is a class pack; null means unlimited
- `allow_self_enrollment: boolean DEFAULT false` — when true, members can book via the client portal without admin intervention

**`enrollments`** — add one column:
- `classes_booked: int DEFAULT 0` — tracks how many sessions the member has consumed from this enrollment

**New table `class_sessions`** — bookable slots admins create per program:
```
id, organization_id, program_id, starts_at, duration_minutes, location?, capacity?, status (scheduled|cancelled), notes?
```

**New table `session_bookings`** — links an enrollment to a session:
```
id, organization_id, session_id, enrollment_id, status (confirmed|cancelled|waitlisted), booked_at
```

Using `enrollmentId` (not just `contactId`) so the credit counter is scoped to the specific pack purchase.

### Booking logic
1. Verify the contact has an active enrollment in the session's program
2. If `program.maxClasses` is set, check `enrollment.classesBooked < program.maxClasses`
3. Check the session is not at capacity
4. Create `SessionBooking`, increment `enrollment.classesBooked`

Cancellation decrements `classesBooked` and frees the session slot.

### Admin UX: session scheduling (calendar view)

The session management panel lives on a new **Program detail page** (`/programs/:id`) — this page does not exist yet and must be created as part of this feature.

The scheduling UI uses a **weekly calendar view** powered by [`react-big-calendar`](https://github.com/jquense/react-big-calendar) (no other calendar library is used in the project). Install in `admin/` only:

```bash
cd admin && npm install react-big-calendar date-fns
```

(`date-fns` is the localizer; it is likely already installed as a transitive dep — check before adding.)

**Interaction model:**
- The calendar renders in week view by default, showing all sessions for the selected program
- Clicking an empty timeslot opens a slide-over / inline form pre-filled with that date and time — fields: duration (minutes), capacity (optional), location (optional), notes (optional)
- Clicking an existing session opens the same form in edit mode, plus a **Cancel session** button (sets `status: cancelled`; does not delete — preserves booking history)
- Cancelled sessions render with a strikethrough style and are not bookable
- A **"+ New session"** button above the calendar opens the form without a pre-filled time, for admins who prefer typing over clicking

**Attendance roster:**
Below the calendar, a collapsible table shows bookings for the selected session (click a session event to select it): contact name, booking status, booked-at timestamp. Admins can manually mark a booking as cancelled from this table.

**No recurrence support in v1.** Each session is created individually. Recurrence (e.g. "every Monday at 6pm") is a future enhancement.

### What to build
- **Backend**: migration, `sessionService.ts`, admin routes (`/api/sessions` CRUD + roster), client routes (`/api/client/sessions/upcoming`, `POST/DELETE /api/client/sessions/:id/book`)
- **Admin portal**:
  - New `ProgramDetailPage` at `/programs/:id` (does not exist yet)
  - Weekly calendar view using `react-big-calendar` for session scheduling
  - Slide-over / inline form for creating and editing sessions
  - Attendance roster panel below the calendar
- **Client portal (`frontend/`)**: "My Classes" page listing upcoming bookable sessions with a Join/Cancel button and remaining-credits indicator
