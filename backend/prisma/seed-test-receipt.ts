/**
 * Test script: seeds a contact + invoice and fires the org receipt email
 * directly with realistic data so you can verify rendering without a live
 * Stripe payment.
 *
 * Usage (from backend/):
 *   railway run npx ts-node --project tsconfig.json prisma/seed-test-receipt.ts
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { sendOrgPaymentReceipt, sendPaymentReceived } from '../src/services/emailService';

const dbUrl = process.env.DATABASE_PUBLIC_URL ?? process.env.DATABASE_URL!;
const prisma = new PrismaClient({ adapter: new PrismaPg(dbUrl) });

async function main() {
  const slug = process.env.DEFAULT_TENANT_SLUG ?? 'default';

  const org = await prisma.organization.findUnique({
    where: { slug },
    include: {
      users: {
        where: { role: 'admin', deletedAt: null as Date | null | undefined },
        select: { email: true, firstName: true },
      },
    },
  });

  if (!org) {
    console.error(`No org found with slug "${slug}" — run the main seed first.`);
    process.exit(1);
  }

  console.log(`Found org: ${org.name} (${org.id})`);
  console.log(`Admin users: ${org.users.map((u: { email: string; firstName: string | null }) => u.email).join(', ')}`);

  // Upsert a test contact
  const contact = await prisma.contact.upsert({
    where: { id: 'seed-test-contact-receipt' },
    update: {},
    create: {
      id: 'seed-test-contact-receipt',
      organizationId: org.id,
      firstName: 'Jane',
      lastName: 'Member',
      email: org.users[0]?.email ?? 'member@example.com', // send member receipt to admin for easy testing
    },
  });

  console.log(`Upserted contact: ${contact.firstName} ${contact.lastName} <${contact.email}>`);

  // Upsert a test invoice
  const invoice = await prisma.invoice.upsert({
    where: { id: 'seed-test-invoice-receipt' },
    update: {},
    create: {
      id: 'seed-test-invoice-receipt',
      organizationId: org.id,
      contactId: contact.id,
      invoiceNumber: 'TEST-0001',
      amountDue: 150.00,
      dueDate: new Date(),
      status: 'paid',
      amountPaid: 150.00,
      paidAt: new Date(),
    },
  });

  console.log(`Upserted invoice: ${invoice.invoiceNumber} ($${invoice.amountDue})`);

  // Fire member receipt
  const memberEmail = contact.email;
  if (memberEmail) {
    await sendPaymentReceived(memberEmail, {
      recipientName: `${contact.firstName} ${contact.lastName}`,
      orgName: org.name,
      invoiceNumber: invoice.invoiceNumber,
      amount: 150.00,
      currency: 'USD',
    });
    console.log(`Sent member receipt to: ${memberEmail}`);
  }

  // Fire org receipt to each admin
  const platformFeePercent = org.platformFeePercent ?? 2;
  const grossAmount = 150.00;
  const platformFee = grossAmount * (platformFeePercent / 100);
  // Simulate realistic Stripe fee (exact in real flow via balance_transaction)
  const stripeFee = +(grossAmount * 0.029 + 0.30).toFixed(2);
  const netAmount = +(grossAmount - platformFee - stripeFee).toFixed(2);

  for (const admin of org.users) {
    await sendOrgPaymentReceipt(admin.email, {
      orgAdminName: admin.firstName ?? 'there',
      orgName: org.name,
      memberName: `${contact.firstName} ${contact.lastName}`,
      invoiceNumber: invoice.invoiceNumber,
      grossAmount,
      platformFee,
      stripeFee,
      netAmount,
      currency: 'USD',
    });
    console.log(`Sent org receipt to: ${admin.email}`);
  }

  console.log('\nDone. Check your inbox.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
