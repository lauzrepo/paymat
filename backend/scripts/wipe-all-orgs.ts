/**
 * Wipes all organizations and their data. Keeps SuperAdmin accounts.
 * Usage: DATABASE_URL=<url> npx ts-node scripts/wipe-all-orgs.ts
 */

import { PrismaClient } from '@prisma/client';
try { require('dotenv').config(); } catch {}

const prisma = new PrismaClient();

async function main() {
  console.log('\n⚠️  Wiping all organizations and related data...\n');

  const counts = await prisma.$transaction(async (tx) => {
    const p  = await tx.payment.deleteMany();
    const fb = await tx.feedbackSubmission.deleteMany();
    const i  = await tx.invoice.deleteMany();
    const e  = await tx.enrollment.deleteMany();
    await tx.user.updateMany({ data: { contactId: null } });
    const c  = await tx.contact.deleteMany();
    const pr = await tx.program.deleteMany();
    const f  = await tx.family.deleteMany();
    const al = await tx.auditLog.deleteMany();
    const u  = await tx.user.deleteMany();
    const it = await tx.inviteToken.deleteMany();
    const o  = await tx.organization.deleteMany();
    return { payments: p.count, feedback: fb.count, invoices: i.count, enrollments: e.count, contacts: c.count, programs: pr.count, families: f.count, auditLogs: al.count, users: u.count, invites: it.count, orgs: o.count };
  });

  console.log('Deleted:');
  Object.entries(counts).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  console.log('\n✅  Done. SuperAdmin accounts untouched.\n');
}

main()
  .catch((err) => { console.error('\n❌', err.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
