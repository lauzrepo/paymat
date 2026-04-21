import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const slug = process.env.DEFAULT_TENANT_SLUG ?? 'default';

  const org = await prisma.organization.upsert({
    where: { slug },
    update: {},
    create: {
      slug,
      name: 'Demo Studio',
      type: 'studio',
      timezone: 'America/New_York',
      primaryColor: '#4f46e5',
    },
  });

  console.log(`Seeded organization: ${org.slug} (${org.id})`);

  // Seed admin user
  const adminEmail = 'admin@demo.com';
  const existing = await prisma.user.findFirst({ where: { organizationId: org.id, email: adminEmail } });

  if (!existing) {
    const passwordHash = await bcrypt.hash('password123', 10);
    await prisma.user.create({
      data: {
        organizationId: org.id,
        email: adminEmail,
        passwordHash,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
      },
    });
    console.log(`Seeded admin user: ${adminEmail} / password123`);
  }

  // Seed super admin
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL ?? 'superadmin@paymat.app';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD ?? 'changeme123!';
  const superAdminPasswordHash = await bcrypt.hash(superAdminPassword, 10);
  await prisma.superAdmin.upsert({
    where: { email: superAdminEmail },
    update: { passwordHash: superAdminPasswordHash },
    create: { email: superAdminEmail, passwordHash: superAdminPasswordHash, name: 'Super Admin' },
  });
  console.log(`Upserted super admin: ${superAdminEmail}`);

  // Seed a sample program
  const program = await prisma.program.upsert({
    where: { id: 'seed-program-1' },
    update: {},
    create: {
      id: 'seed-program-1',
      organizationId: org.id,
      name: 'Beginner Karate',
      description: 'Introductory karate class for ages 5–12',
      price: 75.00,
      billingFrequency: 'monthly',
      capacity: 20,
    },
  });

  console.log(`Seeded program: ${program.name}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
