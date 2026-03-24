# Paige — Backend API

Express + TypeScript + Prisma + PostgreSQL.

## Quick start

```bash
npm install
cp .env.example .env
# Edit .env
npx prisma db push
npx ts-node prisma/seed.ts
npm run dev
# Runs on http://localhost:5000
```

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | 32+ char secret for access tokens |
| `JWT_REFRESH_SECRET` | 32+ char secret for refresh tokens |
| `HELCIM_API_TOKEN` | Helcim API token (stubbed in dev) |
| `HELCIM_WEBHOOK_SECRET` | Helcim webhook secret |
| `DEFAULT_TENANT_SLUG` | Local dev tenant slug (bypasses subdomain) |
| `BASE_DOMAIN` | Production base domain |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Start production server |
| `npm run lint` | Lint |
| `npm run format` | Format |
| `npx prisma db push` | Apply schema changes |
| `npx prisma studio` | Open database GUI |

## API routes

### Auth (`/api/auth`)
- `POST /register` — register user
- `POST /login` — login
- `POST /logout` — logout
- `POST /refresh-token` — refresh access token
- `GET /me` — current user
- `POST /forgot-password` — request reset link (returns `resetUrl` in dev)
- `POST /reset-password` — reset password with token

### Tenant (`/api/tenant`)
- `GET /branding` — public endpoint, returns org name/logo/color for current subdomain

### Health
- `GET /health` — health check

> Additional domain routes (contacts, families, programs, enrollments, invoices, payments) are being built — see `TODO.md`.

## Multi-tenancy

Every request goes through `resolveTenant` middleware which reads the subdomain (e.g. `acme.yourapp.com` → slug `acme`), looks up the `Organization`, and attaches it to `req.tenant`. Locally, `DEFAULT_TENANT_SLUG` is used instead.

All database queries are scoped by `organizationId`.

## Auth

JWT-based. Access tokens expire in 15 minutes. Refresh tokens expire in 7 days. Token payload includes `userId`, `email`, `tenantId`, and `role`.

Password reset tokens are stored on the User record with a 1-hour expiry. In dev mode the reset URL is returned in the API response.

## Payments

Helcim is stubbed in development — all Helcim API calls return realistic fake responses. Swap `src/services/helcimService.ts` for real API calls when ready.

No card numbers are stored. All card data is tokenized client-side via Helcim.js.

## Project structure

```
backend/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── src/
    ├── config/        environment, database
    ├── controllers/   route handlers
    ├── middleware/    auth, error handling, rate limiting, tenant, validation
    ├── routes/        express routers
    ├── services/      business logic
    ├── types/         express augmentations
    ├── utils/         logger
    └── server.ts
```
