/**
 * Sets up a contact for a test recurring billing run.
 * Finds the first contact with an active enrollment, sets a stub helcimToken on them,
 * and moves their enrollment's nextBillingDate to yesterday so billing picks it up.
 *
 * Usage:
 *   DATABASE_URL=<public_url> npx ts-node prisma/test-billing-setup.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find first active enrollment that has a contact
  const enrollment = await prisma.enrollment.findFirst({
    where: { status: 'active' },
    include: {
      contact: true,
      program: true,
    },
  });

  if (!enrollment) {
    console.error('No active enrollments found. Create an enrollment first via the admin UI.');
    process.exit(1);
  }

  const { contact, program } = enrollment;
  console.log(`Found enrollment: ${contact.firstName} ${contact.lastName} → ${program.name} ($${program.price}/${program.billingFrequency})`);

  // Set a stub helcimToken on the contact (simulates a saved card on file)
  await prisma.contact.update({
    where: { id: contact.id },
    data: { helcimToken: 'test-visa-token-4242' },
  });
  console.log(`Set helcimToken on contact ${contact.firstName} ${contact.lastName}`);

  // Set nextBillingDate to yesterday so the billing run picks it up immediately
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: { nextBillingDate: yesterday },
  });
  console.log(`Set nextBillingDate to ${yesterday.toDateString()} on enrollment ${enrollment.id}`);

  console.log('\n✅ Ready. Go to Settings → "Run billing now" to trigger the billing run.');
  console.log(`   Expect: 1 invoice created + 1 auto-charged (stub Visa ****4242).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
