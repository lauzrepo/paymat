/**
 * Seed script — creates a family with two contacts, two enrollments,
 * and demonstrates both invoice scenarios:
 *
 *   Scenario A: Two separate contact-level invoices (current billing run behavior)
 *   Scenario B: One family-level invoice with two line items (manual grouping)
 *
 * Usage:
 *   DATABASE_URL=<url> npx ts-node scripts/seed-family-data.ts
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();
const ORG_SLUG = 'kings-martial-arts';

/** Fetch the globally highest INV-XXXXX number and return the next one. */
async function nextInvoiceNumber() {
  const all = await prisma.invoice.findMany({ select: { invoiceNumber: true } });
  const max = all.reduce((m, inv) => {
    const n = parseInt(inv.invoiceNumber.replace(/\D/g, ''), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return `INV-${String(max + 1).padStart(5, '0')}`;
}

async function main() {
  console.log(`\n🔍 Looking up organization: ${ORG_SLUG}`);
  const org = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (!org) throw new Error(`Organization "${ORG_SLUG}" not found.`);
  console.log(`✅ Found org: ${org.name} (${org.id})`);

  // ── 1. Family ──────────────────────────────────────────────────────────────
  console.log('\n👨‍👩‍👧‍👦 Creating Johnson Family...');
  let family = await prisma.family.findFirst({
    where: { organizationId: org.id, name: 'Johnson Family' },
  });
  if (family) {
    console.log(`  ↩  Family already exists (${family.id}), reusing.`);
  } else {
    family = await prisma.family.create({
      data: {
        organizationId: org.id,
        name: 'Johnson Family',
        billingEmail: 'johnson.family@example.com',
      },
    });
    console.log(`  ✅ Family created: ${family.name} (${family.id})`);
  }

  // ── 2. Two contacts in the family ──────────────────────────────────────────
  console.log('\n👤 Creating family members...');
  const memberDefs = [
    { firstName: 'Emma', lastName: 'Johnson', email: 'emma.johnson.test@example.com' },
    { firstName: 'Liam', lastName: 'Johnson', email: 'liam.johnson.test@example.com' },
  ];

  const members = [];
  for (const def of memberDefs) {
    let contact = await prisma.contact.findFirst({
      where: { organizationId: org.id, email: def.email },
    });
    if (contact) {
      console.log(`  ↩  ${def.firstName} ${def.lastName} already exists (${contact.id}), reusing.`);
    } else {
      contact = await prisma.contact.create({
        data: {
          organizationId: org.id,
          familyId: family.id,
          firstName: def.firstName,
          lastName: def.lastName,
          email: def.email,
          status: 'active',
          notes: 'Seeded family member — safe to delete',
        },
      });
      console.log(`  ✅ Created ${def.firstName} ${def.lastName} (${contact.id})`);
    }

    // Ensure the contact is linked to the family even if it already existed
    if (contact.familyId !== family.id) {
      await prisma.contact.update({ where: { id: contact.id }, data: { familyId: family.id } });
      console.log(`  🔗 Linked ${def.firstName} to family.`);
    }

    members.push(contact);
  }

  // ── 3. Programs ───────────────────────────────────────────────────────────
  console.log('\n🥋 Finding or creating programs...');
  const programDefs = [
    { name: 'Beginner Karate', price: 120 },
    { name: 'Advanced Karate', price: 150 },
  ];

  const programs = [];
  for (const def of programDefs) {
    let program = await prisma.program.findFirst({
      where: { organizationId: org.id, name: def.name },
    });
    if (program) {
      console.log(`  ↩  "${def.name}" already exists (${program.id}), reusing.`);
    } else {
      program = await prisma.program.create({
        data: {
          organizationId: org.id,
          name: def.name,
          price: new Decimal(def.price),
          billingFrequency: 'monthly',
          isActive: true,
        },
      });
      console.log(`  ✅ Created program: ${program.name} ($${program.price}/mo)`);
    }
    programs.push(program);
  }

  // ── 4. Enrollments ────────────────────────────────────────────────────────
  // Emma → Beginner Karate, Liam → Advanced Karate
  console.log('\n📅 Creating enrollments...');
  const enrollmentPairs = [
    { contact: members[0], program: programs[0] },
    { contact: members[1], program: programs[1] },
  ];

  const enrollments = [];
  for (const { contact, program } of enrollmentPairs) {
    let enrollment = await prisma.enrollment.findUnique({
      where: { contactId_programId: { contactId: contact.id, programId: program.id } },
    });
    if (enrollment) {
      console.log(`  ↩  ${contact.firstName} → ${program.name} already enrolled (${enrollment.id}), reusing.`);
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
      console.log(`  ✅ Enrolled ${contact.firstName} in ${program.name} (${enrollment.id})`);
    }
    enrollments.push({ contact, program, enrollment });
  }

  // ── 5A. Scenario A: Separate per-contact invoices (billing run behavior) ──
  console.log('\n📄 Scenario A: Individual contact invoices (billing run style)...');
  const invoicesA = [];
  for (const { contact, program, enrollment } of enrollments) {
    const num = await nextInvoiceNumber();
    const dueDate = new Date();
    dueDate.setUTCHours(0, 0, 0, 0);
    dueDate.setUTCDate(dueDate.getUTCDate() + 30);

    const price = new Decimal(Number(program.price));
    const inv = await prisma.invoice.create({
      data: {
        organizationId: org.id,
        contactId: contact.id,
        invoiceNumber: num,
        amountDue: price,
        amountPaid: new Decimal(0),
        currency: 'USD',
        status: 'sent',
        dueDate,
        notes: `Auto-generated — ${program.name}`,
        lineItems: {
          create: [{
            enrollmentId: enrollment.id,
            description: `${program.name} — Monthly Fee`,
            quantity: 1,
            unitPrice: price,
            total: price,
          }],
        },
      },
    });
    console.log(`  ✅ ${num}  ${contact.firstName} ${contact.lastName}  $${program.price}  (1 line item)`);
    invoicesA.push(inv);
  }

  // ── 5B. Scenario B: One family-level invoice with all line items ───────────
  console.log('\n📄 Scenario B: Single family invoice with multiple line items...');
  const numB = await nextInvoiceNumber();
  const dueB = new Date();
  dueB.setUTCHours(0, 0, 0, 0);
  dueB.setUTCDate(dueB.getUTCDate() + 30);

  const totalB = enrollments.reduce((s, e) => s + Number(e.program.price), 0);

  const invoiceB = await prisma.invoice.create({
    data: {
      organizationId: org.id,
      familyId: family.id,          // ← billed to family, not individual contact
      invoiceNumber: numB,
      amountDue: new Decimal(totalB),
      amountPaid: new Decimal(0),
      currency: 'USD',
      status: 'sent',
      dueDate: dueB,
      notes: 'Family invoice — all members',
      lineItems: {
        create: enrollments.map(({ contact, program, enrollment }) => ({
          enrollmentId: enrollment.id,
          description: `${contact.firstName} ${contact.lastName} — ${program.name}`,
          quantity: 1,
          unitPrice: new Decimal(Number(program.price)),
          total: new Decimal(Number(program.price)),
        })),
      },
    },
  });
  console.log(`  ✅ ${numB}  Johnson Family  $${totalB}  (${enrollments.length} line items)`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Seed complete!\n');
  console.log(`  Family:     ${family.name} (${family.id})`);
  console.log(`  Members:    ${members.map((m) => `${m.firstName} ${m.lastName}`).join(', ')}`);
  console.log('');
  console.log('  Scenario A — Per-contact invoices (current billing run behavior):');
  for (let i = 0; i < invoicesA.length; i++) {
    const inv = invoicesA[i];
    const { contact, program } = enrollments[i];
    console.log(`    ${inv.invoiceNumber}  →  ${contact.firstName} ${contact.lastName}  $${program.price}  1 line item`);
  }
  console.log('');
  console.log('  Scenario B — Single family invoice (manual grouping):');
  console.log(`    ${invoiceB.invoiceNumber}  →  Johnson Family  $${totalB}  ${enrollments.length} line items`);
  console.log('');
  console.log('  NOTE: The billing run currently uses Scenario A (per enrollment, per contact).');
  console.log('  Family-grouped invoices (Scenario B) require manual creation or a billing');
  console.log('  service change to group enrollments by family before invoicing.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((err) => { console.error('\n❌ Seed failed:', err.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
