import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../config/database';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import {
  generateSuperAdminTokens,
  verifySuperAdminRefreshToken,
} from '../middleware/superAdminAuth';
import { config } from '../config/environment';
import stripeConnectService from '../services/stripeConnectService';
import { sendStripeOnboardingEmail } from '../services/emailService';
import logger from '../utils/logger';

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const superAdminLogin = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError(400, 'Email and password are required');

  const admin = await prisma.superAdmin.findUnique({ where: { email } });
  if (!admin) throw new AppError(401, 'Invalid credentials');

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) throw new AppError(401, 'Invalid credentials');

  const { accessToken, refreshToken } = generateSuperAdminTokens(admin.id, admin.email);

  res.json({
    status: 'success',
    data: {
      superAdmin: { id: admin.id, email: admin.email, name: admin.name },
      accessToken,
      refreshToken,
    },
  });
});

export const superAdminRefreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new AppError(400, 'Refresh token required');

  let payload: { superAdminId: string; email: string };
  try {
    payload = verifySuperAdminRefreshToken(refreshToken);
  } catch {
    throw new AppError(401, 'Invalid or expired refresh token');
  }

  const admin = await prisma.superAdmin.findUnique({ where: { id: payload.superAdminId } });
  if (!admin) throw new AppError(401, 'Super admin not found');

  const tokens = generateSuperAdminTokens(admin.id, admin.email);
  res.json({ status: 'success', data: tokens });
});

export const getSuperAdminMe = asyncHandler(async (req: Request, res: Response) => {
  const admin = await prisma.superAdmin.findUnique({
    where: { id: req.superAdmin!.superAdminId },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  if (!admin) throw new AppError(404, 'Not found');
  res.json({ status: 'success', data: { superAdmin: admin } });
});

export const changeSuperAdminPassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw new AppError(400, 'currentPassword and newPassword are required');
  if (newPassword.length < 8) throw new AppError(400, 'New password must be at least 8 characters');

  const admin = await prisma.superAdmin.findUnique({ where: { id: req.superAdmin!.superAdminId } });
  if (!admin) throw new AppError(404, 'Not found');

  const valid = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!valid) throw new AppError(401, 'Current password is incorrect');

  const passwordHash = await bcrypt.hash(newPassword, config.security.bcryptRounds);
  await prisma.superAdmin.update({ where: { id: admin.id }, data: { passwordHash } });

  res.json({ status: 'success', data: { message: 'Password updated successfully' } });
});

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

export const listOrganizations = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? 1), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 20), 10)));
  const search = String(req.query.search ?? '').trim();

  const where = search
    ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { slug: { contains: search, mode: 'insensitive' as const } }] }
    : {};

  const [organizations, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { contacts: true, invoices: true, users: true } },
      },
    }),
    prisma.organization.count({ where }),
  ]);

  res.json({
    status: 'success',
    data: { organizations, total, page, totalPages: Math.ceil(total / limit) },
  });
});

export const getOrganization = asyncHandler(async (req: Request, res: Response) => {
  const org = await prisma.organization.findUnique({
    where: { id: req.params.id as string },
    include: {
      _count: { select: { contacts: true, families: true, programs: true, invoices: true, payments: true, users: true } },
      users: {
        where: { deletedAt: null },
        select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!org) throw new AppError(404, 'Organization not found');

  // Revenue stats
  const revenueResult = await prisma.payment.aggregate({
    where: { organizationId: org.id, status: 'succeeded' },
    _sum: { amount: true },
  });

  res.json({
    status: 'success',
    data: {
      organization: {
        ...org,
        stats: {
          totalRevenue: revenueResult._sum.amount ?? 0,
        },
      },
    },
  });
});

export const createOrganization = asyncHandler(async (req: Request, res: Response) => {
  const { name, slug, type, timezone, adminEmail, adminPassword, adminName } = req.body;

  if (!name || !slug || !adminEmail || !adminPassword) {
    throw new AppError(400, 'name, slug, adminEmail, and adminPassword are required');
  }

  const existing = await prisma.organization.findUnique({ where: { slug } });
  if (existing) throw new AppError(409, 'Slug already taken');

  const passwordHash = await bcrypt.hash(adminPassword, config.security.bcryptRounds);

  const org = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name, slug, type: type ?? 'general', timezone: timezone ?? 'America/New_York' },
    });

    await tx.user.create({
      data: {
        organizationId: organization.id,
        email: adminEmail,
        passwordHash,
        firstName: adminName?.split(' ')[0] ?? '',
        lastName: adminName?.split(' ').slice(1).join(' ') ?? '',
        role: 'admin',
      },
    });

    return organization;
  });

  res.status(201).json({ status: 'success', data: { organization: org } });
});

export const updateOrganization = asyncHandler(async (req: Request, res: Response) => {
  const { name, slug, type, timezone, logoUrl, primaryColor } = req.body;

  if (slug) {
    const conflict = await prisma.organization.findFirst({
      where: { slug, NOT: { id: req.params.id as string } },
    });
    if (conflict) throw new AppError(409, 'Slug already taken');
  }

  const org = await prisma.organization.update({
    where: { id: req.params.id as string },
    data: { name, slug, type, timezone, logoUrl, primaryColor },
  });

  res.json({ status: 'success', data: { organization: org } });
});

export const setOrganizationActive = asyncHandler(async (req: Request, res: Response) => {
  const { active } = req.body as { active: boolean };
  const org = await prisma.organization.update({
    where: { id: req.params.id as string },
    data: { isActive: active },
  });
  res.json({ status: 'success', data: { organization: org } });
});

// POST /super-admin/organizations/:id/promote
// Promotes an org from sandbox (Stripe test) to production (Stripe live).
// Clears the existing test Connect account so the org re-onboards on the live key.
export const promoteOrganizationToProduction = asyncHandler(async (req: Request, res: Response) => {
  const org = await prisma.organization.findUnique({ where: { id: req.params.id as string } });
  if (!org) throw new AppError(404, 'Organization not found');
  if (!org.sandboxMode) throw new AppError(400, 'Organization is already in production mode');

  // Provision a new live Connect account for the org
  const appUrl = config.email.appUrl;
  let connectOnboardingUrl: string | null = null;

  const adminUser = await prisma.user.findFirst({
    where: { organizationId: org.id, role: 'admin', deletedAt: null },
    select: { email: true, firstName: true, lastName: true },
    orderBy: { createdAt: 'asc' },
  });
  const adminEmail = adminUser?.email ?? `admin@${org.slug}.placeholder`;
  const adminName = adminUser ? `${adminUser.firstName} ${adminUser.lastName}`.trim() || adminEmail : adminEmail;

  const liveConnectAccountId = await stripeConnectService.createConnectAccount(
    org.id,
    org.name,
    adminEmail,
    false // live mode
  );

  connectOnboardingUrl = await stripeConnectService.createAccountOnboardingLink(
    liveConnectAccountId,
    `${appUrl}/onboarding?stripe=connected`,
    `${appUrl}/onboarding?stripe=refresh`,
    false // live mode
  );

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      sandboxMode: false,
      stripeConnectAccountId: liveConnectAccountId,
      stripeConnectOnboardingComplete: false,
    },
  });

  await sendStripeOnboardingEmail(adminEmail, {
    recipientName: adminName,
    orgName: org.name,
    onboardingUrl: connectOnboardingUrl,
  });

  logger.info(`[SuperAdmin] org ${org.id} promoted to production — new Connect account ${liveConnectAccountId}, onboarding email sent to ${adminEmail}`);

  res.json({
    status: 'success',
    data: { emailSentTo: adminEmail },
  });
});

export const deleteOrganization = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) throw new AppError(404, 'Organization not found');

  // Cascade delete in FK dependency order (no DB-level cascade on org relations)
  await prisma.$transaction(async (tx) => {
    await tx.payment.deleteMany({ where: { organizationId: id } });
    await tx.feedbackSubmission.deleteMany({ where: { organizationId: id } });
    // Deleting invoices cascades InvoiceLineItem (onDelete: Cascade on that relation)
    await tx.invoice.deleteMany({ where: { organizationId: id } });
    // Enrollments reference contacts/programs; lineItems already gone via invoice cascade
    await tx.enrollment.deleteMany({ where: { contact: { organizationId: id } } });
    // Clear User.contactId FK before deleting contacts
    await tx.user.updateMany({ where: { organizationId: id }, data: { contactId: null } });
    await tx.contact.deleteMany({ where: { organizationId: id } });
    await tx.program.deleteMany({ where: { organizationId: id } });
    await tx.family.deleteMany({ where: { organizationId: id } });
    await tx.auditLog.deleteMany({ where: { organizationId: id } });
    await tx.user.deleteMany({ where: { organizationId: id } });
    await tx.organization.delete({ where: { id } });
  });

  res.status(204).send();
});
