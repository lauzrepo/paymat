/**
 * Self-contained test setup for recurring billing.
 * Creates a contact + enrollment if none exist, sets a stub helcimToken,
 * and moves nextBillingDate to yesterday so the billing run picks it up.
 *
 * Usage:
 *   DATABASE_URL=<public_url> npx ts-node prisma/test-billing-setup.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find the org
  const org = await prisma.organization.findFirst();
  if (!org) { console.error('No organization found. Run the seed first.'); process.exit(1); }

  // Find or create a program
  let program = await prisma.program.findFirst({ where: { organizationId: org.id, isActive: true } });
  if (!program) {
    program = await prisma.program.create({
      data: {
        organizationId: org.id,
        name: 'Monthly Membership',
        price: 75.00,
        billingFrequency: 'monthly',
      },
    });
    console.log(`Created program: ${program.name}`);
  } else {
    console.log(`Using program: ${program.name} ($${program.price}/${program.billingFrequency})`);
  }

  // Find or create a test contact
  let contact = await prisma.contact.findFirst({ where: { organizationId: org.id } });
  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        organizationId: org.id,
        firstName: 'Test',
        lastName: 'Student',
        email: 'test.student@example.com',
        status: 'active',
      },
    });
    console.log(`Created contact: ${contact.firstName} ${contact.lastName}`);
  } else {
    console.log(`Using contact: ${contact.firstName} ${contact.lastName}`);
  }

  // Set a stub helcimToken (simulates a saved card on file)
  await prisma.contact.update({
    where: { id: contact.id },
    data: { helcimToken: 'test-visa-token-4242' },
  });
  console.log(`Set helcimToken on ${contact.firstName} ${contact.lastName}`);

  // Find or create an active enrollment
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  let enrollment = await prisma.enrollment.findFirst({
    where: { contactId: contact.id, programId: program.id },
  });

  if (!enrollment) {
    enrollment = await prisma.enrollment.create({
      data: {
        contactId: contact.id,
        programId: program.id,
        status: 'active',
        startDate: yesterday,
        nextBillingDate: yesterday,
      },
    });
    console.log(`Created enrollment`);
  } else {
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { status: 'active', nextBillingDate: yesterday },
    });
    console.log(`Reset nextBillingDate to yesterday on existing enrollment`);
  }

  console.log('\n✅ Ready. Go to Settings → "Run billing now".');
  console.log(`   Expect: 1 invoice created, 1 auto-charged (stub Visa ****4242), status: paid.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
