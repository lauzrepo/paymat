/**
 * Full reset + seed for the lauz org:
 *   1. Clears all payments, invoices
 *   2. Replaces programs with taekwondo curriculum (in-place, preserves FKs)
 *   3. Creates contacts, families, enrollments, and Stripe test customers
 *
 *   Individuals with card on file (auto-charge):
 *     • Alex Turner  → White Belt $90/mo
 *     • Sara Malik   → Adult TKD  $95/mo
 *
 *   Individual with NO card (invoice email):
 *     • Jamie Chen   → Color Belt $100/mo
 *
 *   Individual with NO card — portal card-save test:
 *     • Riley Park   → Little Dragons $80/mo
 *
 *   Lau Family — family card (grouped invoice, auto-charge $170):
 *     • Ben Lau      → Little Dragons $80/mo
 *     • Chloe Lau    → White Belt    $90/mo
 *
 *   Park Family — no family card (individual invoice emails):
 *     • Daniel Park  → Advanced TKD $115/mo
 *     • Hannah Park  → Adult TKD    $95/mo
 *
 * Usage:
 *   DATABASE_URL=<url> STRIPE_SECRET_KEY=<key> npx ts-node scripts/seed-test-data.ts
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import Stripe from 'stripe';
import bcrypt from 'bcrypt';
try { require('dotenv').config(); } catch {}

const prisma = new PrismaClient();
const ORG_SLUG = 'lauz';

const TKD_PROGRAMS = [
  { name: 'Little Dragons (Ages 4–7)',    description: 'Fun, structured introduction to Taekwondo fundamentals for young children.',                                                                          price: new Decimal('80.00'),  billingFrequency: 'monthly',  capacity: 16 },
  { name: 'White Belt — Beginner TKD',    description: 'Foundation Taekwondo for new students of all ages. Covers basic techniques through yellow belt.',                                                   price: new Decimal('90.00'),  billingFrequency: 'monthly',  capacity: 20 },
  { name: 'Color Belt — Intermediate TKD',description: 'Intermediate program for yellow through red belt. Introduces poomsae, sparring, and self-defence.',                                                  price: new Decimal('100.00'), billingFrequency: 'monthly',  capacity: 20 },
  { name: 'Advanced TKD — Black Belt Prep',description: 'High-intensity training for red belt and above preparing for 1st dan grading.',                                                                    price: new Decimal('115.00'), billingFrequency: 'monthly',  capacity: 12 },
  { name: 'Adult TKD',                    description: 'All-levels adult Taekwondo covering technique, fitness, and mental focus.',                                                                         price: new Decimal('95.00'),  billingFrequency: 'monthly',  capacity: 20 },
  { name: 'Competition Team',             description: 'Selective program for students competing in regional and national TKD tournaments.',                                                                 price: new Decimal('130.00'), billingFrequency: 'monthly',  capacity: 10 },
  { name: 'Private Lesson',               description: "One-on-one instruction tailored to the student's current rank and goals.",                                                                          price: new Decimal('65.00'),  billingFrequency: 'one_time', capacity: null },
];

const EMAILS = {
  alex:   'alex.turner@lauz.test',
  sara:   'sara.malik@lauz.test',
  jamie:  'm2rcu7.528@gmail.com',
  riley:  'riley@lauz.test',
  lauFam: 'm2rcu7.528+laufam@gmail.com',
  daniel: 'm2rcu7.528+daniel@gmail.com',
  hannah: 'm2rcu7.528+hannah@gmail.com',
};

async function attachTestCard(stripe: Stripe, acct: string, customerId: string): Promise<string> {
  const pm = await stripe.paymentMethods.attach('pm_card_visa', { customer: customerId }, { stripeAccount: acct });
  await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: pm.id } }, { stripeAccount: acct });
  console.log(`      💳 Attached pm_card_visa (${pm.id})`);
  return pm.id;
}

async function createStripeCustomer(stripe: Stripe, acct: string, email: string, name: string): Promise<string> {
  const c = await stripe.customers.create({ email, name }, { stripeAccount: acct });
  console.log(`      🔑 Stripe customer: ${c.id}`);
  return c.id;
}

async function main() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) throw new Error('STRIPE_SECRET_KEY is required');
  const stripe = new Stripe(stripeKey);

  // ── Org ─────────────────────────────────────────────────────────────────────
  console.log(`\n🔍 Looking up organization: ${ORG_SLUG}`);
  const org = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (!org) throw new Error(`Organization "${ORG_SLUG}" not found.`);
  if (!org.stripeConnectAccountId) throw new Error('Org has no stripeConnectAccountId — complete onboarding first.');
  const acct = org.stripeConnectAccountId;
  console.log(`✅  ${org.name} (${org.id})  Connect: ${acct}\n`);

  // ── 1. Clear payments & invoices ─────────────────────────────────────────────
  console.log('💳 Clearing payments and invoices...');
  const { count: payCount } = await prisma.payment.deleteMany({ where: { organizationId: org.id } });
  const { count: invCount } = await prisma.invoice.deleteMany({ where: { organizationId: org.id } });
  console.log(`   Deleted ${payCount} payment(s), ${invCount} invoice(s)\n`);

  // ── 2. Clear existing contacts, families, enrollments, client users ──────────
  console.log('🧹 Clearing contacts, families, enrollments, client users...');
  await prisma.enrollment.deleteMany({ where: { contact: { organizationId: org.id } } });
  await prisma.user.updateMany({ where: { organizationId: org.id, role: 'client' }, data: { contactId: null } });
  await prisma.user.deleteMany({ where: { organizationId: org.id, role: 'client' } });
  await prisma.contact.deleteMany({ where: { organizationId: org.id } });
  await prisma.family.deleteMany({ where: { organizationId: org.id } });
  console.log('   Done\n');

  // ── 3. Replace programs with taekwondo curriculum ────────────────────────────
  console.log('🥋 Replacing programs with taekwondo curriculum...');
  const existing = await prisma.program.findMany({ where: { organizationId: org.id }, orderBy: { createdAt: 'asc' } });

  for (let i = 0; i < existing.length; i++) {
    const def = TKD_PROGRAMS[i] ?? { name: `Taekwondo Program ${i + 1}`, description: 'Taekwondo training program.', price: new Decimal('90.00'), billingFrequency: 'monthly', capacity: null };
    await prisma.program.update({ where: { id: existing[i].id }, data: { ...def, isActive: true } });
    console.log(`   ↻  "${existing[i].name}" → "${def.name}"`);
  }
  for (const def of TKD_PROGRAMS.slice(existing.length)) {
    const p = await prisma.program.create({ data: { organizationId: org.id, ...def, isActive: true } });
    console.log(`   ➕  Created "${p.name}"`);
  }

  const programs = await prisma.program.findMany({ where: { organizationId: org.id, isActive: true }, orderBy: { createdAt: 'asc' } });
  const find = (kw: string) => {
    const p = programs.find(p => p.name.toLowerCase().includes(kw.toLowerCase()));
    if (!p) throw new Error(`Program matching "${kw}" not found`);
    return p;
  };
  const littleDragons = find('little dragons');
  const whiteBelt     = find('white belt');
  const colorBelt     = find('color belt');
  const advancedTkd   = find('advanced');
  const adultTkd      = find('adult');
  console.log('');

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const PORTAL_PASSWORD = 'test1234';
  const passwordHash = await bcrypt.hash(PORTAL_PASSWORD, 10);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  async function mkContact(opts: { firstName: string; lastName: string; email: string; familyId?: string; withCard?: boolean; portalLogin?: boolean }) {
    let stripeCid: string | null = null;
    let pmId: string | null = null;
    if (opts.withCard) {
      stripeCid = await createStripeCustomer(stripe, acct, opts.email, `${opts.firstName} ${opts.lastName}`);
      pmId = await attachTestCard(stripe, acct, stripeCid);
    }
    const c = await prisma.contact.create({
      data: { organizationId: org!.id, familyId: opts.familyId ?? null, firstName: opts.firstName, lastName: opts.lastName, email: opts.email, stripeCustomerId: stripeCid, stripeDefaultPaymentMethodId: pmId, status: 'active' },
    });

    if (opts.portalLogin !== false) {
      await prisma.user.upsert({
        where: { organizationId_email: { organizationId: org!.id, email: opts.email } },
        update: { passwordHash, firstName: opts.firstName, lastName: opts.lastName, role: 'client', contactId: c.id, deletedAt: null },
        create: { organizationId: org!.id, email: opts.email, passwordHash, firstName: opts.firstName, lastName: opts.lastName, role: 'client', contactId: c.id },
      });
      console.log(`   ✅  ${opts.firstName} ${opts.lastName} (${c.id}) — ${stripeCid ? 'card on file' : 'no card'} — portal login: ${opts.email} / ${PORTAL_PASSWORD}`);
    } else {
      console.log(`   ✅  ${opts.firstName} ${opts.lastName} (${c.id}) — ${stripeCid ? 'card on file' : 'no card'}`);
    }

    return c;
  }

  async function enroll(contactId: string, program: { id: string; name: string; price: Decimal }) {
    await prisma.enrollment.create({ data: { contactId, programId: program.id, status: 'active', startDate: today, nextBillingDate: today } });
    console.log(`      📅 ${program.name}  $${program.price}/mo`);
  }

  // ── 4. Seed contacts ─────────────────────────────────────────────────────────
  console.log('── Alex Turner (individual, card on file) ─────────────────');
  const alex = await mkContact({ firstName: 'Alex', lastName: 'Turner', email: EMAILS.alex, withCard: true });
  await enroll(alex.id, whiteBelt);

  console.log('\n── Sara Malik (individual, card on file) ──────────────────');
  const sara = await mkContact({ firstName: 'Sara', lastName: 'Malik', email: EMAILS.sara, withCard: true });
  await enroll(sara.id, adultTkd);

  console.log('\n── Jamie Chen (no card — invoice email) ───────────────────');
  const jamie = await mkContact({ firstName: 'Jamie', lastName: 'Chen', email: EMAILS.jamie });
  await enroll(jamie.id, colorBelt);

  console.log('\n── Riley Park (no card — portal card-save test) ───────────');
  const riley = await mkContact({ firstName: 'Riley', lastName: 'Park', email: EMAILS.riley });
  await enroll(riley.id, littleDragons);
  console.log('      ℹ️  Pay invoice in portal → card saved → re-run billing → auto-charged');

  console.log('\n── Lau Family (family card, grouped $170) ─────────────────');
  const lauCid  = await createStripeCustomer(stripe, acct, EMAILS.lauFam, 'Lau Family');
  const lauPmId = await attachTestCard(stripe, acct, lauCid);
  const lauFam  = await prisma.family.create({ data: { organizationId: org.id, name: 'Lau Family', billingEmail: EMAILS.lauFam, stripeCustomerId: lauCid, stripeDefaultPaymentMethodId: lauPmId } });
  console.log(`   🏠 Family: ${lauFam.id}`);
  const ben   = await mkContact({ firstName: 'Ben',   lastName: 'Lau', email: 'ben.lau@lauz.test',   familyId: lauFam.id, portalLogin: false });
  const chloe = await mkContact({ firstName: 'Chloe', lastName: 'Lau', email: 'chloe.lau@lauz.test', familyId: lauFam.id, portalLogin: false });
  await enroll(ben.id,   littleDragons);
  await enroll(chloe.id, whiteBelt);

  console.log('\n── Park Family (no family card — individual emails) ────────');
  const parkFam = await prisma.family.create({ data: { organizationId: org.id, name: 'Park Family', billingEmail: null } });
  console.log(`   🏠 Family: ${parkFam.id}`);
  const daniel = await mkContact({ firstName: 'Daniel', lastName: 'Park', email: EMAILS.daniel, familyId: parkFam.id, portalLogin: false });
  const hannah = await mkContact({ firstName: 'Hannah', lastName: 'Park', email: EMAILS.hannah, familyId: parkFam.id, portalLogin: false });
  await enroll(daniel.id, advancedTkd);
  await enroll(hannah.id, adultTkd);

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅  Reset + seed complete!\n');
  console.log('Expected billing run:');
  console.log('  Auto-charged    Alex $90 · Sara $95 · Lau Family $170');
  console.log('  Invoice emails  Jamie $100 · Riley $80 · Daniel $115 · Hannah $95');
  console.log('\nPortal logins (password: test1234):');
  console.log('  alex.turner@lauz.test  (card on file — no action needed)');
  console.log('  sara.malik@lauz.test   (card on file — no action needed)');
  console.log('  m2rcu7.528@gmail.com   (Jamie — no card, pay via portal)');
  console.log('  riley@lauz.test        (card-save test)');
  console.log('\nCard-save test:');
  console.log('  Log in as riley@lauz.test → pay invoice → card saved → re-run billing → auto-charged $80');
  console.log('\nRun billing: Admin UI → Billing → "Run billing now"');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((err) => { console.error('\n❌ Script failed:', err.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
