/**
 * Prepares lauz for a live email test:
 *   1. Finds one contact with no card on file (so billing generates an invoice
 *      email without auto-charging) and sets their email to the test address.
 *   2. Clears all payments + invoices for the org.
 *   3. Resets nextBillingDate to today on that contact's active enrollment(s).
 *
 * After running this, hit "Run billing" in the admin UI — the contact will
 * receive exactly one "Invoice Generated" email.
 *
 * Usage:
 *   DATABASE_URL=<url> npx ts-node scripts/prep-email-test.ts
 */

import { PrismaClient } from '@prisma/client';
dotenv();

function dotenv() {
  try { require('dotenv').config(); } catch {}
}

const prisma = new PrismaClient();
const ORG_SLUG = 'lauz';
const TEST_EMAIL = 'm2rcu7.528@gmail.com';

async function main() {
  const org = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (!org) throw new Error(`Organization "${ORG_SLUG}" not found.`);
  console.log(`\n✅  Org: ${org.name} (${org.id})\n`);

  // Find a contact with no card on file and at least one active enrollment
  const candidate = await prisma.contact.findFirst({
    where: {
      organizationId: org.id,
      helcimToken: null,
      enrollments: { some: { status: 'active' } },
    },
    include: {
      enrollments: { where: { status: 'active' }, include: { program: true } },
    },
  });

  if (!candidate) throw new Error('No suitable contact found (need one with no card + active enrollment).');

  console.log(`👤  Contact: ${candidate.firstName} ${candidate.lastName} (${candidate.id})`);
  console.log(`    Enrollments: ${candidate.enrollments.map(e => e.program.name).join(', ')}`);
  console.log(`    Old email: ${candidate.email ?? '(none)'}`);

  await prisma.contact.update({
    where: { id: candidate.id },
    data: { email: TEST_EMAIL },
  });
  console.log(`    New email: ${TEST_EMAIL}\n`);

  // Clear all payments and invoices for the org
  const { count: payCount } = await prisma.payment.deleteMany({ where: { organizationId: org.id } });
  console.log(`💳  Deleted ${payCount} payment(s)`);

  const { count: invCount } = await prisma.invoice.deleteMany({ where: { organizationId: org.id } });
  console.log(`🧾  Deleted ${invCount} invoice(s)\n`);

  // Reset billing date on this contact's active enrollments only
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (const e of candidate.enrollments) {
    await prisma.enrollment.update({
      where: { id: e.id },
      data: { nextBillingDate: today },
    });
  }
  console.log(`📅  Reset ${candidate.enrollments.length} enrollment(s) to bill today\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅  Ready — go to Billing in the admin UI and click "Run billing now".');
  console.log(`    ${TEST_EMAIL} will receive an invoice email.\n`);
}

main()
  .catch((err) => { console.error('\n❌ Script failed:', err.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
