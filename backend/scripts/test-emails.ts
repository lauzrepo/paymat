/**
 * Sends one of each customer-facing email template to a test address.
 *
 * Usage:
 *   DATABASE_URL=<url> RESEND_API_KEY=<key> npx ts-node scripts/test-emails.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { sendInvoiceGenerated, sendPaymentReceived, sendPaymentFailed } from '../src/services/emailService';

const TO = 'm2rcu7.528@gmail.com';

async function main() {
  console.log(`\nSending test emails to ${TO}…\n`);

  console.log('1/3  Invoice Generated…');
  await sendInvoiceGenerated(TO, {
    recipientName: 'Test User',
    orgName: 'Kings Martial Arts',
    invoiceNumber: 'INV-00001',
    amount: 90,
    currency: 'USD',
    dueDate: new Date('2026-05-01'),
    programName: 'White Belt — Beginner TKD',
    portalUrl: 'https://portal.cliqpaymat.app/invoices/test-invoice-id',
  });
  console.log('   ✅  Sent');

  console.log('2/3  Payment Received…');
  await sendPaymentReceived(TO, {
    recipientName: 'Test User',
    orgName: 'Kings Martial Arts',
    invoiceNumber: 'INV-00001',
    amount: 90,
    currency: 'USD',
  });
  console.log('   ✅  Sent');

  console.log('3/3  Payment Failed…');
  await sendPaymentFailed(TO, {
    recipientName: 'Test User',
    orgName: 'Kings Martial Arts',
    invoiceNumber: 'INV-00001',
    amount: 90,
    currency: 'USD',
    portalUrl: 'https://portal.cliqpaymat.app/invoices/test-invoice-id',
  });
  console.log('   ✅  Sent');

  console.log('\nDone — check your inbox.\n');
}

main().catch((err) => {
  console.error('\n❌ Failed:', err.message);
  process.exit(1);
});
