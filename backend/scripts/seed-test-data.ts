/**
 * Seed script — creates a test contact, program, enrollment, and invoice
 * for the kings-martial-arts organization.
 *
 * Usage:
 *   DATABASE_URL=<url> npx ts-node scripts/seed-test-data.ts
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();
const ORG_SLUG = 'kings-martial-arts';

async function main() {
  console.log(`\n🔍 Looking up organization: ${ORG_SLUG}`);
  const org = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (!org) throw new Error(`Organization "${ORG_SLUG}" not found.`);
  console.log(`✅ Found org: ${org.name} (${org.id})`);

  // ── 1. Contact ──────────────────────────────────────────────────────────
  console.log('\n📋 Creating test contact...');
  let contact = await prisma.contact.findFirst({
    where: { organizationId: org.id, email: 'alex.teststudent@example.com' },
  });
  if (contact) {
    console.log(`  ↩  Contact already exists (${contact.id}), reusing.`);
  } else {
    contact = await prisma.contact.create({
      data: {
        organizationId: org.id,
        firstName: 'Alex',
        lastName: 'TestStudent',
        email: 'alex.teststudent@example.com',
        phone: '555-000-1234',
        status: 'active',
        notes: 'Seeded test contact — safe to delete',
      },
    });
    console.log(`  ✅ Contact: ${contact.firstName} ${contact.lastName} (${contact.id})`);
  }

  // ── 2. Program ──────────────────────────────────────────────────────────
  console.log('\n🥋 Finding or creating "Beginner Karate" program...');
  let program = await prisma.program.findFirst({
    where: { organizationId: org.id, name: 'Beginner Karate' },
  });
  if (program) {
    console.log(`  ↩  Program already exists (${program.id}), reusing.`);
  } else {
    program = await prisma.program.create({
      data: {
        organizationId: org.id,
        name: 'Beginner Karate',
        description: 'Monthly beginner karate classes',
        price: new Decimal(120),
        billingFrequency: 'monthly',
        isActive: true,
      },
    });
    console.log(`  ✅ Program created: ${program.name} (${program.id})`);
  }

  // ── 3. Enrollment ────────────────────────────────────────────────────────
  console.log('\n📅 Creating enrollment...');
  let enrollment = await prisma.enrollment.findUnique({
    where: { contactId_programId: { contactId: contact.id, programId: program.id } },
  });
  if (enrollment) {
    console.log(`  ↩  Enrollment already exists (${enrollment.id}), reusing.`);
  } else {
    const startDate = new Date();
    startDate.setUTCHours(0, 0, 0, 0);
    const nextBilling = new Date(startDate);
    nextBilling.setUTCMonth(nextBilling.getUTCMonth() + 1);

    enrollment = await prisma.enrollment.create({
      data: {
        contactId: contact.id,
        programId: program.id,
        status: 'active',
        startDate,
        nextBillingDate: nextBilling,
      },
    });
    console.log(`  ✅ Enrollment created (${enrollment.id})`);
  }

  // ── 4. Invoice ───────────────────────────────────────────────────────────
  console.log('\n🧾 Creating test invoice...');

  // invoiceNumber is globally unique — query across ALL orgs to find the true max
  const allInvoices = await prisma.invoice.findMany({
    select: { invoiceNumber: true },
  });
  const maxNum = allInvoices.reduce((max, inv) => {
    const n = parseInt(inv.invoiceNumber.replace(/\D/g, ''), 10);
    return isNaN(n) ? max : Math.max(max, n);
  }, 0);
  const invoiceNumber = `INV-${String(maxNum + 1).padStart(5, '0')}`;

  const dueDate = new Date();
  dueDate.setUTCHours(0, 0, 0, 0);
  dueDate.setUTCDate(dueDate.getUTCDate() + 30);

  const unitPrice = new Decimal(120);

  const invoice = await prisma.invoice.create({
    data: {
      organizationId: org.id,
      contactId: contact.id,
      invoiceNumber,
      amountDue: unitPrice,
      amountPaid: new Decimal(0),
      currency: 'USD',
      status: 'sent',
      dueDate,
      notes: 'Seeded test invoice — safe to delete',
      lineItems: {
        create: [{
          description: 'Beginner Karate — Monthly Fee',
          quantity: 1,
          unitPrice,
          total: unitPrice,
          enrollmentId: enrollment.id,
        }],
      },
    },
    include: { lineItems: true },
  });
  console.log(`  ✅ Invoice: ${invoice.invoiceNumber}  $${invoice.amountDue}  status: ${invoice.status}`);
  console.log(`     Due: ${invoice.dueDate.toISOString().slice(0, 10)}  |  ID: ${invoice.id}`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Seed complete!\n');
  console.log(`  Org:        ${org.name}`);
  console.log(`  Contact:    ${contact.firstName} ${contact.lastName} <${contact.email}> (${contact.id})`);
  console.log(`  Program:    ${program.name}  ($${program.price}/mo)  (${program.id})`);
  console.log(`  Enrollment: ${enrollment.id}  status: ${enrollment.status}`);
  console.log(`  Invoice:    ${invoice.invoiceNumber}  $${invoice.amountDue}  status: ${invoice.status}  (${invoice.id})`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((err) => { console.error('\n❌ Seed failed:', err.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
