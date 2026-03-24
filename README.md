# Paige — Member Management & Billing for Small Service Businesses

A lightweight SaaS platform for service businesses (gyms, studios, schools, clubs) that need to manage recurring clients and collect payments — without the complexity or cost of enterprise software.

## What it does

- Manage **contacts** (members, students, clients) and family/group accounts
- Define **programs** with pricing and billing frequency
- Track **enrollments** linking contacts to programs
- Auto-generate **invoices** per billing cycle
- Accept **payments** via Helcim (card tokenization, no card data on server)
- **Multi-tenant** — each business gets its own subdomain with custom branding
- Two separate portals: **admin** (the business) and **client** (the member/parent)

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
├── backend/     Express + TypeScript + Prisma + PostgreSQL API
├── admin/       Vite + React — business owner/staff portal
└── client/      Vite + React — member/parent portal
```

## Quick start

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env — set DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
npx prisma db push
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

## Architecture

```
Subdomain → resolveTenant middleware → Organization context
                                              ↓
Routes → Controllers → Services → Prisma ORM → PostgreSQL
              ↓
         Auth middleware (JWT — admin | staff | client roles)
```

**Multi-tenancy:** Each organization is identified by subdomain (e.g. `acme.yourapp.com`). All data is scoped by `organizationId`. Locally, `DEFAULT_TENANT_SLUG` in `.env` bypasses subdomain lookup.

**Payments:** All card data is tokenized client-side via Helcim.js. No card numbers are sent to or stored on the backend.

## Tech stack

| Layer | Technology |
|---|---|
| API | Express, TypeScript, Zod, Helmet |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | JWT (15min access / 7day refresh) |
| Payments | Helcim |
| Admin UI | Vite, React, TanStack Query, React Hook Form, Tailwind CSS |
| Client UI | Vite, React, TanStack Query, React Hook Form, Tailwind CSS |

## Environment variables

See `backend/.env.example`. Required:

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — 32+ character secret for access tokens
- `JWT_REFRESH_SECRET` — 32+ character secret for refresh tokens
- `HELCIM_API_TOKEN` — Helcim API token (stub mode works without this)
- `DEFAULT_TENANT_SLUG` — used for local dev (bypasses subdomain lookup)
- `BASE_DOMAIN` — production base domain (e.g. `yourapp.com`)
