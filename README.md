# Paymat — Member Management & Billing for Small Service Businesses

A lightweight SaaS platform for service businesses (gyms, studios, schools, clubs) that need to manage recurring clients and collect payments — without the complexity or cost of enterprise software.

## What it does

- Manage **contacts** (members, students, clients) and family/group accounts
- Define **programs** with pricing and billing frequency
- Track **enrollments** linking contacts to programs
- Auto-generate **invoices** per billing cycle
- Accept **payments** via Stripe Connect (card payments, no card data on server)
- **Multi-tenant** — each business gets its own subdomain with custom branding
- **Sandbox → production** workflow — orgs start in test mode and are promoted to live by a super admin
- Three separate portals: **admin** (business owner/staff), **client** (member/parent), and **super admin** (platform operator)

## Who it's for

Small service businesses with recurring customers:
- Martial arts schools, dance studios, music schools
- Gyms and yoga studios
- Youth sports leagues and clubs
- Tutoring centers
- Any business billing members on a recurring schedule

## Project structure

```
/
├── backend/      Express + TypeScript + Prisma + PostgreSQL API
├── admin/        Vite + React — business owner/staff portal
├── client/       Vite + React — member/parent portal
├── superadmin/   Vite + React — platform operator portal
└── landing/      Landing/marketing page
```

## Deployed URLs

| App | URL |
|---|---|
| Admin portal | `[slug].cliqpaymat.app` |
| Client portal | `[slug].cliqpaymat.app/client` |
| Super admin | `admin.cliqpaymat.app` |
| Landing | `cliqpaymat.app` |
| API | `party-house-production.up.railway.app` |

## Quick start

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env — set DATABASE_URL, JWT secrets, Stripe keys
npx prisma migrate deploy
npx ts-node prisma/seed.ts
npm run dev
# Runs on http://localhost:5000
```

### Admin portal

```bash
cd admin
npm install
npm run dev
# Runs on http://localhost:5173
```

### Client portal

```bash
cd client
npm install
npm run dev
# Runs on http://localhost:5174
```

### Super admin portal

```bash
cd superadmin
npm install
npm run dev
# Runs on http://localhost:5175
```

## Architecture

```
Subdomain → resolveTenant middleware → Organization context
                                              ↓
Routes → Controllers → Services → Prisma ORM → PostgreSQL
              ↓
         Auth middleware (JWT — admin | staff | client roles)
```

**Multi-tenancy:** Each organization is identified by subdomain (e.g. `acme.cliqpaymat.app`). All data is scoped by `organizationId`. Locally, `DEFAULT_TENANT_SLUG` in `.env` bypasses subdomain lookup.

**Payments:** Stripe Connect — each org has its own connected Stripe account. Card data is handled entirely by Stripe; no card numbers touch the backend.

**Sandbox mode:** New organizations are created in sandbox mode (Stripe test keys). A super admin promotes them to production, which provisions a live Stripe Connect account and triggers re-onboarding.

**Super admin:** A separate JWT-authenticated portal for platform operators to manage organizations, send billing checkout links, and promote orgs from sandbox to production.

## Tech stack

| Layer | Technology |
|---|---|
| API | Express, TypeScript, Zod, Helmet |
| ORM | Prisma 7 + `@prisma/adapter-pg` |
| Database | PostgreSQL (Railway) |
| Auth | JWT (15min access / 7day refresh) |
| Payments | Stripe Connect |
| Admin UI | Vite, React, TanStack Query, Tailwind CSS v4 |
| Client UI | Vite, React, TanStack Query, Tailwind CSS v4 |
| Super admin UI | Vite, React, TanStack Query, Tailwind CSS v4 |
| Hosting | Railway (API + DB), Vercel (all frontends) |

## Environment variables

See `backend/.env.example`. Required:

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — 32+ character secret for access tokens
- `JWT_REFRESH_SECRET` — 32+ character secret for refresh tokens
- `SUPER_ADMIN_JWT_SECRET` — secret for super admin access tokens
- `SUPER_ADMIN_JWT_REFRESH_SECRET` — secret for super admin refresh tokens
- `STRIPE_SECRET_KEY` — Stripe test secret key
- `STRIPE_SECRET_KEY_LIVE` — Stripe live secret key (for production orgs)
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `DEFAULT_TENANT_SLUG` — used for local dev (bypasses subdomain lookup)
- `BASE_DOMAIN` — production base domain (e.g. `cliqpaymat.app`)
- `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` — seeded super admin credentials
