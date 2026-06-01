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
