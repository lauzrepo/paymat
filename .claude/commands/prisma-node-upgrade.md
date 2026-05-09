# Prisma + Node Upgrade Guide

Use this skill when upgrading Node or Prisma versions in the paymat backend.
It captures every gotcha discovered during the Node 18→24 + Prisma 5→7 migration.

---

## Step 1 — Update `package.json` engines + deps

```json
"engines": { "node": ">=24.0.0", "npm": ">=10.0.0" }
```

**Prisma 7 requires three packages** (not just `@prisma/client`):

| Package | Where |
|---|---|
| `@prisma/client ^7.x` | dependencies |
| `@prisma/adapter-pg ^7.x` | dependencies |
| `pg ^8.x` | dependencies |
| `prisma ^7.x` | devDependencies |
| `@types/pg ^8.x` | devDependencies |

---

## Step 2 — Remove `url` from `prisma/schema.prisma`

Prisma 7 **removes** `url` from the datasource block. Delete it:

```prisma
// BEFORE (Prisma ≤6)
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// AFTER (Prisma 7)
datasource db {
  provider = "postgresql"
}
```

---

## Step 3 — Create `prisma.config.ts` (CLI config, not runtime)

Prisma 7 uses this file for CLI tools (migrate, studio, etc.).
Create at the project root (next to `package.json`):

```typescript
import { defineConfig } from 'prisma/config';

export default defineConfig({
  datasourceUrl: process.env.DATABASE_URL,
});
```

Also copy it in `Dockerfile` before `npm ci`:
```dockerfile
COPY prisma.config.ts ./
```

---

## Step 4 — Rewrite `src/config/database.ts` (runtime adapter)

Prisma 7 on Node 24 types `datasourceUrl` in `PrismaClientOptions` as `never`.
You **must** use the `@prisma/adapter-pg` driver adapter instead:

```typescript
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import logger from '../utils/logger';

const adapter = new PrismaPg(process.env.DATABASE_URL!);

const prisma = new PrismaClient({
  adapter,
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
});
```

`PrismaPg` accepts a connection string directly, a `pg.PoolConfig`, or a `pg.Pool`.

---

## Step 5 — Fix `Decimal` imports

`@prisma/client/runtime/library` is **removed** in Prisma 7.
Replace every import of `Decimal` from it:

```typescript
// BEFORE (Prisma ≤6)
import { Decimal } from '@prisma/client/runtime/library';

// AFTER (Prisma 7)
import { Prisma } from '@prisma/client';
const Decimal = Prisma.Decimal;
type Decimal = Prisma.Decimal;
```

Affected files in this project: `billingService.ts`, `invoiceService.ts`,
`paymentService.ts`, `programService.ts`, `webhookController.ts`.

---

## Step 6 — Fix TypeScript 6 `moduleResolution` deprecation

TypeScript 6 deprecated `moduleResolution: "node"` (now called `node10`).
Add to `tsconfig.json` `compilerOptions`:

```json
"ignoreDeprecations": "6.0"
```

---

## Step 7 — Dockerfile must use `npm ci` (not `--omit=dev`)

TypeScript is a devDependency. If you exclude devDeps before building,
`tsc` won't be found. The build stage should install ALL deps:

```dockerfile
FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

---

## Step 8 — Local type-checking caveat

`prisma generate` requires Node ≥20. If your local machine runs an older Node,
the generated types in `node_modules/.prisma/client/` will be stale.
**Local `tsc --noEmit` errors from Prisma types are unreliable** — the Railway
build runs `prisma generate && tsc` on Node 24 and is the authoritative check.

Real errors to fix locally regardless:
- `TS7006 Parameter implicitly has 'any' type` in non-Prisma code
- Anything in files you actually edited

---

## Checklist

- [ ] `package.json` — engines + adapter-pg + pg + @types/pg
- [ ] `prisma/schema.prisma` — remove `url` from datasource
- [ ] `prisma.config.ts` — created at project root
- [ ] `Dockerfile` — copies `prisma.config.ts`, uses `npm ci`
- [ ] `src/config/database.ts` — uses `PrismaPg` adapter, not `datasourceUrl`
- [ ] All `@prisma/client/runtime/library` imports replaced with `Prisma.Decimal`
- [ ] `tsconfig.json` — `"ignoreDeprecations": "6.0"` if on TypeScript 6
- [ ] `npm install` run locally to update lockfile
- [ ] Push → watch Railway build logs on Node 24
