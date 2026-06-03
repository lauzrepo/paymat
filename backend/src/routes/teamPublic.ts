import { Router } from 'express';
import bcrypt from 'bcrypt';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { config } from '../config/environment';
import prisma from '../config/database';

const router = Router();

// GET /api/team/invite/:token — verify token, return email + orgName (no auth, no tenant)
router.get('/invite/:token', asyncHandler(async (req, res) => {
  const invite = await prisma.staffInvite.findUnique({
    where: { token: req.params.token },
    include: { organization: { select: { name: true } } },
  });

  if (!invite) throw new AppError(404, 'Invite not found');
  if (invite.usedAt) throw new AppError(410, 'This invite has already been used. Please sign in or reset your password.');

  res.json({ status: 'success', data: { email: invite.email, orgName: invite.organization.name } });
}));

// POST /api/team/invite/:token/accept — create staff User, mark invite used (no auth, no tenant)
router.post('/invite/:token/accept', asyncHandler(async (req, res) => {
  const { firstName, lastName, password } = req.body;
  if (!firstName || !lastName || !password) {
    throw new AppError(400, 'First name, last name, and password are required');
  }

  const invite = await prisma.staffInvite.findUnique({
    where: { token: req.params.token },
  });

  if (!invite) throw new AppError(404, 'Invite not found');
  if (invite.usedAt) throw new AppError(410, 'This invite has already been used. Please sign in or reset your password.');

  const existing = await prisma.user.findFirst({
    where: { organizationId: invite.organizationId, email: invite.email, deletedAt: null },
  });
  if (existing) throw new AppError(409, 'An account for this email already exists. Please sign in.');

  const passwordHash = await bcrypt.hash(password, config.security.bcryptRounds);

  await prisma.$transaction([
    prisma.user.create({
      data: {
        organizationId: invite.organizationId,
        email: invite.email,
        passwordHash,
        firstName,
        lastName,
        role: 'staff',
      },
    }),
    prisma.staffInvite.update({ where: { id: invite.id }, data: { usedAt: new Date() } }),
  ]);

  res.status(201).json({ status: 'success', message: 'Account created. You can now sign in.' });
}));

export default router;
