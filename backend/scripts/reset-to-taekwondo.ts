/**
 * Reset script for lauz:
 *   1. Replaces all programs with taekwondo equivalents (in-place update
 *      so existing enrollments keep their foreign keys intact)
 *   2. Clears all payments and invoices for the org
 *   3. Resets nextBillingDate on all active enrollments to today so the
 *      next billing run immediately generates fresh invoices
 *
 * Usage:
 *   DATABASE_URL=<url> npx ts-node scripts/reset-to-taekwondo.ts
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();
const ORG_SLUG = 'lauz';

// Taekwondo program definitions — assigned to existing programs in order.
// If the org has fewer programs than this list, extra entries are created.
// If it has more, the remainder are renamed generically.
const TKD_PROGRAMS = [
  {
    name: 'Little Dragons (Ages 4–7)',
    description: 'Fun, structured introduction to Taekwondo fundamentals for young children. Focuses on basic kicks, stances, and self-discipline.',
    price: new Decimal('80.00'),
    billingFrequency: 'monthly',
    capacity: 16,
  },
  {
    name: 'White Belt — Beginner TKD',
    description: 'Foundation Taekwondo program for new students of all ages. Covers basic techniques, terminology, and belt requirements through yellow belt.',
    price: new Decimal('90.00'),
    billingFrequency: 'monthly',
    capacity: 20,
  },
  {
    name: 'Color Belt — Intermediate TKD',
    description: 'Intermediate program for students holding yellow through red belt. Introduces advanced patterns (poomsae), sparring, and self-defence.',
    price: new Decimal('100.00'),
    billingFrequency: 'monthly',
    capacity: 20,
  },
  {
    name: 'Advanced TKD — Black Belt Prep',
    description: 'High-intensity training for red belt and above candidates preparing for 1st dan black belt grading. Pattern refinement, full sparring, and leadership.',
    price: new Decimal('115.00'),
    billingFrequency: 'monthly',
    capacity: 12,
  },
  {
    name: 'Adult TKD',
    description: 'All-levels adult Taekwondo. Structured classes covering technique, fitness, and mental focus. Suitable for complete beginners through advanced adults.',
    price: new Decimal('95.00'),
    billingFrequency: 'monthly',
    capacity: 20,
  },
  {
    name: 'Competition Team',
    description: 'Selective program for students competing in regional and national TKD tournaments. Additional sparring, strategy, and tournament preparation.',
    price: new Decimal('130.00'),
    billingFrequency: 'monthly',
    capacity: 10,
  },
  {
    name: 'Private Lesson',
    description: 'One-on-one instruction tailored to the student\'s current rank and goals. Available for all ages and skill levels.',
    price: new Decimal('65.00'),
    billingFrequency: 'one_time',
    capacity: null,
  },
];

async function main() {
  console.log(`\n🔍 Looking up organization: ${ORG_SLUG}`);
  const org = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (!org) throw new Error(`Organization "${ORG_SLUG}" not found.`);
  console.log(`✅  Found: ${org.name} (${org.id})\n`);

  // ── 1. Clear payments ─────────────────────────────────────────────────────
  console.log('💳 Deleting all payments...');
  const { count: payCount } = await prisma.payment.deleteMany({ where: { organizationId: org.id } });
  console.log(`   Deleted ${payCount} payment(s)\n`);

  // ── 2. Clear invoices (cascades line items) ───────────────────────────────
  console.log('🧾 Deleting all invoices (and line items)...');
  const { count: invCount } = await prisma.invoice.deleteMany({ where: { organizationId: org.id } });
  console.log(`   Deleted ${invCount} invoice(s)\n`);

  // ── 3. Replace programs ───────────────────────────────────────────────────
  console.log('🥋 Replacing programs with Taekwondo curriculum...');
  const existingPrograms = await prisma.program.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`   Found ${existingPrograms.length} existing program(s)`);

  // Update existing programs in-place (preserves enrollment foreign keys)
  for (let i = 0; i < existingPrograms.length; i++) {
    const def = TKD_PROGRAMS[i] ?? {
      name: `Taekwondo Program ${i + 1}`,
      description: 'Taekwondo training program.',
      price: new Decimal('90.00'),
      billingFrequency: 'monthly',
      capacity: null,
    };
    await prisma.program.update({
      where: { id: existingPrograms[i].id },
      data: {
        name: def.name,
        description: def.description,
        price: def.price,
        billingFrequency: def.billingFrequency,
        capacity: def.capacity,
        isActive: true,
      },
    });
    console.log(`   ✅  Updated: "${existingPrograms[i].name}" → "${def.name}"`);
  }

  // Create any additional programs not covered by existing records
  const extras = TKD_PROGRAMS.slice(existingPrograms.length);
  for (const def of extras) {
    const created = await prisma.program.create({
      data: { organizationId: org.id, ...def, isActive: true },
    });
    console.log(`   ➕  Created: "${created.name}"`);
  }

  // ── 4. Reset nextBillingDate on active enrollments ────────────────────────
  console.log('\n📅 Resetting nextBillingDate on active enrollments to today...');
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const { count: enrollCount } = await prisma.enrollment.updateMany({
    where: {
      status: 'active',
      contact: { organizationId: org.id },
    },
    data: { nextBillingDate: today },
  });
  console.log(`   Reset ${enrollCount} active enrollment(s)\n`);

  // ── Summary ───────────────────────────────────────────────────────────────
  const finalPrograms = await prisma.program.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: 'asc' },
    select: { name: true, price: true, billingFrequency: true },
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅  Reset complete!\n');
  console.log('Programs now active:');
  finalPrograms.forEach((p) => {
    console.log(`  • ${p.name}  —  $${p.price}/${p.billingFrequency}`);
  });
  console.log(`\nActive enrollments with nextBillingDate = today: ${enrollCount}`);
  console.log('\nNext step: hit "Run billing" in the admin UI to generate fresh invoices.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((err) => { console.error('\n❌ Script failed:', err.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
