/**
 * Creates a super admin account.
 * Usage: DATABASE_URL=<url> npx ts-node scripts/create-super-admin.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
try { require('dotenv').config(); } catch {}

const prisma = new PrismaClient();

const EMAIL    = 'marcus@cliqpaymat.app';
const PASSWORD = 'changeme123';
const NAME     = 'Marcus Lau';

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const admin = await prisma.superAdmin.upsert({
    where: { email: EMAIL },
    update: { passwordHash, name: NAME },
    create: { email: EMAIL, passwordHash, name: NAME },
  });

  console.log(`\n✅  Super admin ready: ${admin.email}`);
  console.log(`    Password: ${PASSWORD}`);
  console.log('    Change this after first login.\n');
}

main()
  .catch((err) => { console.error('\n❌', err.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
