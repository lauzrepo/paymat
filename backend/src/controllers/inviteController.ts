import { Request, Response } from 'express';
import prisma from '../config/database';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { sendInviteEmail } from '../services/emailService';
import stripeConnectService from '../services/stripeConnectService';

export const createInvite = asyncHandler(async (req: Request, res: Response) => {
  const { email, recipientName, orgName, platformFeePercent } = req.body;

  if (!email?.trim()) throw new AppError(400, 'email is required');
  if (!recipientName?.trim()) throw new AppError(400, 'recipientName is required');
  if (!orgName?.trim()) throw new AppError(400, 'orgName is required');

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invite = await prisma.inviteToken.create({
    data: {
      email: email.trim().toLowerCase(),
      recipientName: recipientName.trim(),
      orgName: orgName.trim(),
      expiresAt,
    },
  });

  await sendInviteEmail({
    token: invite.token,
    recipientEmail: invite.email,
    recipientName: invite.recipientName,
    orgName: invite.orgName,
    platformFeePercent: typeof platformFeePercent === 'number' ? platformFeePercent : undefined,
  });

  res.status(201).json({ status: 'success', data: { invite } });
});

export const listInvites = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? 1), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 20), 10)));

  const [items, total] = await Promise.all([
    prisma.inviteToken.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.inviteToken.count(),
  ]);

  res.json({ status: 'success', data: { items, total, page, limit } });
});

export const verifyInvite = asyncHandler(async (req: Request, res: Response) => {
  const token = req.params.token as string;

  const invite = await prisma.inviteToken.findUnique({ where: { token } });

  if (!invite) throw new AppError(404, 'Invite not found');
  if (invite.usedAt) throw new AppError(410, 'Invite already used');
  if (invite.expiresAt < new Date()) throw new AppError(410, 'Invite has expired');

  res.json({
    status: 'success',
    data: { invite: { email: invite.email, recipientName: invite.recipientName, orgName: invite.orgName } },
  });
});

export const resendInvite = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { platformFeePercent } = req.body;

  const invite = await prisma.inviteToken.findUnique({ where: { id } });
  if (!invite) throw new AppError(404, 'Invite not found');
  if (invite.usedAt) throw new AppError(410, 'Invite has already been accepted');

  // Refresh expiry to 7 days from now
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.inviteToken.update({ where: { id }, data: { expiresAt } });

  await sendInviteEmail({
    token: invite.token,
    recipientEmail: invite.email,
    recipientName: invite.recipientName,
    orgName: invite.orgName,
    platformFeePercent: typeof platformFeePercent === 'number' ? platformFeePercent : undefined,
  });

  res.json({ status: 'success', data: { message: 'Invite resent successfully' } });
});

export const deleteInvite = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const invite = await prisma.inviteToken.findUnique({ where: { id } });
  if (!invite) throw new AppError(404, 'Invite not found');

  await prisma.inviteToken.delete({ where: { id } });

  res.status(204).send();
});

export const redeemInvite = asyncHandler(async (req: Request, res: Response) => {
  const token = req.params.token as string;
  const { slug, adminPassword } = req.body;

  if (!slug?.trim()) throw new AppError(400, 'slug is required');
  if (!adminPassword || adminPassword.length < 8) throw new AppError(400, 'Password must be at least 8 characters');

  const invite = await prisma.inviteToken.findUnique({ where: { token } });
  if (!invite) throw new AppError(404, 'Invite not found');
  if (invite.usedAt) throw new AppError(410, 'Invite already used');
  if (invite.expiresAt < new Date()) throw new AppError(410, 'Invite has expired');

  const existing = await prisma.organization.findUnique({ where: { slug: slug.trim() } });
  if (existing) throw new AppError(409, 'Slug already taken');

  const bcrypt = await import('bcrypt');
  const { config } = await import('../config/environment');
  const passwordHash = await bcrypt.hash(adminPassword, config.security.bcryptRounds);

  const [nameParts] = [invite.recipientName.split(' ')];
  const firstName = nameParts[0] ?? '';
  const lastName = invite.recipientName.split(' ').slice(1).join(' ') ?? '';

  let orgId = '';

  await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name: invite.orgName, slug: slug.trim(), type: 'general', timezone: 'America/New_York' },
    });
    orgId = organization.id;

    await tx.user.create({
      data: {
        organizationId: organization.id,
        email: invite.email,
        passwordHash,
        firstName,
        lastName,
        role: 'admin',
      },
    });

    await tx.inviteToken.update({
      where: { token },
      data: { usedAt: new Date() },
    });
  });

  // Provision Stripe Connect Express account and generate onboarding link
  let connectOnboardingUrl: string | null = null;
  try {
    const connectAccountId = await stripeConnectService.createConnectAccount(
      orgId!,
      invite.orgName,
      invite.email
    );

    await prisma.organization.update({
      where: { id: orgId! },
      data: { stripeConnectAccountId: connectAccountId },
    });

    const appUrl = config.email.appUrl;
    connectOnboardingUrl = await stripeConnectService.createAccountOnboardingLink(
      connectAccountId,
      `${appUrl}/onboarding?stripe=connected`,
      `${appUrl}/onboarding?stripe=refresh&token=${token}`
    );
  } catch (err) {
    // Non-fatal — org is created, Connect can be retried later
    const logger = (await import('../utils/logger')).default;
    logger.error('[Onboarding] Failed to provision Stripe Connect account', { err, orgId });
  }

  res.json({
    status: 'success',
    data: {
      message: 'Account created. Complete payment setup to get started.',
      connectOnboardingUrl,
    },
  });
});
