import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { config } from '../config/environment';
import prisma from '../config/database';
import { sendStaffInvite } from '../services/emailService';
import logger from '../utils/logger';

const router = Router();

const TEAM_ROLES = ['admin', 'staff'] as const;
type TeamRole = typeof TEAM_ROLES[number];
const isTeamRole = (role: unknown): role is TeamRole => TEAM_ROLES.includes(role as TeamRole);

router.use(authenticateToken);
router.use(requireRole('admin'));

// GET /api/team — list all non-client team members + pending invites
router.get('/', asyncHandler(async (req, res) => {
  const [members, pendingInvites] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId: req.organization!.id, role: { not: 'client' }, deletedAt: null },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.staffInvite.findMany({
      where: { organizationId: req.organization!.id, usedAt: null },
      select: { id: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  res.json({ status: 'success', data: { members, pendingInvites } });
}));

// POST /api/team/invite — send a team invite email (role defaults to staff)
router.post('/invite', asyncHandler(async (req, res) => {
  const { email, role = 'staff' } = req.body;
  if (!email || typeof email !== 'string') throw new AppError(400, 'Email is required');
  if (!isTeamRole(role)) throw new AppError(400, 'Role must be admin or staff');

  const existing = await prisma.user.findFirst({
    where: { organizationId: req.organization!.id, email, deletedAt: null },
  });
  if (existing) throw new AppError(409, 'A user with this email already exists in this organization');

  const [org, adminUser] = await Promise.all([
    prisma.organization.findUnique({ where: { id: req.organization!.id }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: req.user!.userId }, select: { firstName: true, lastName: true, email: true } }),
  ]);

  const invite = await prisma.staffInvite.create({
    data: { organizationId: req.organization!.id, email, role, invitedBy: req.user!.userId },
  });

  const adminName = `${adminUser?.firstName ?? ''} ${adminUser?.lastName ?? ''}`.trim() || adminUser?.email || req.user!.email;
  const acceptUrl = `${config.email.appUrl}/accept-invite?token=${invite.token}`;

  sendStaffInvite(email, { adminName, orgName: org!.name, acceptUrl })
    .catch((err) => logger.warn('[StaffInvite] Failed to send invite email', { err, inviteId: invite.id }));

  res.status(201).json({ status: 'success', data: { invite: { id: invite.id, email: invite.email, role: invite.role, createdAt: invite.createdAt } } });
}));

// POST /api/team/invite/:id/resend — resend the email for a pending invite
router.post('/invite/:id/resend', asyncHandler(async (req, res) => {
  const inviteId = req.params.id as string;
  const invite = await prisma.staffInvite.findFirst({
    where: { id: inviteId, organizationId: req.organization!.id, usedAt: null },
  });
  if (!invite) throw new AppError(404, 'Pending invite not found');

  const [org, adminUser] = await Promise.all([
    prisma.organization.findUnique({ where: { id: req.organization!.id }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: req.user!.userId }, select: { firstName: true, lastName: true, email: true } }),
  ]);

  const adminName = `${adminUser?.firstName ?? ''} ${adminUser?.lastName ?? ''}`.trim() || adminUser?.email || req.user!.email;
  const acceptUrl = `${config.email.appUrl}/accept-invite?token=${invite.token}`;

  await sendStaffInvite(invite.email, { adminName, orgName: org!.name, acceptUrl });

  res.json({ status: 'success', message: 'Invite resent' });
}));

// DELETE /api/team/invite/:id — cancel a pending invite
router.delete('/invite/:id', asyncHandler(async (req, res) => {
  const inviteId = req.params.id as string;
  const invite = await prisma.staffInvite.findFirst({
    where: { id: inviteId, organizationId: req.organization!.id, usedAt: null },
  });
  if (!invite) throw new AppError(404, 'Pending invite not found');

  await prisma.staffInvite.delete({ where: { id: invite.id } });

  res.json({ status: 'success', message: 'Invite cancelled' });
}));

// PATCH /api/team/:userId — change a team member's role between admin and staff
router.patch('/:userId', asyncHandler(async (req, res) => {
  const userId = req.params.userId as string;
  const { role } = req.body;

  if (!isTeamRole(role)) throw new AppError(400, 'Role must be admin or staff');
  // The caller is always an admin, so blocking self-changes guarantees the org keeps at least one admin
  if (userId === req.user!.userId) {
    throw new AppError(400, 'You cannot change your own role');
  }

  const member = await prisma.user.findFirst({
    where: { id: userId, organizationId: req.organization!.id, role: { not: 'client' }, deletedAt: null },
  });
  if (!member) throw new AppError(404, 'Team member not found');

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true },
  });

  if (member.role !== role) {
    await prisma.auditLog.create({
      data: {
        organizationId: req.organization!.id,
        userId: req.user!.userId,
        action: 'TEAM_ROLE_CHANGED',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { targetUserId: userId, from: member.role, to: role },
      },
    });
  }

  res.json({ status: 'success', data: { member: updated } });
}));

// DELETE /api/team/:userId — revoke a team member's access (soft delete)
router.delete('/:userId', asyncHandler(async (req, res) => {
  const userId = req.params.userId as string;

  if (userId === req.user!.userId) {
    throw new AppError(400, 'You cannot remove your own access');
  }

  const member = await prisma.user.findFirst({
    where: { id: userId, organizationId: req.organization!.id, role: { not: 'client' }, deletedAt: null },
  });
  if (!member) throw new AppError(404, 'Team member not found');

  await prisma.user.update({ where: { id: userId }, data: { deletedAt: new Date() } });

  res.json({ status: 'success', message: 'Access revoked' });
}));

export default router;
