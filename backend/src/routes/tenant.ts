import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import prisma from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Public — used by frontend to get branding before login
router.get('/branding', (req: Request, res: Response) => {
  const org = req.organization!;
  res.json({
    status: 'success',
    data: {
      name: org.name,
      logoUrl: org.logoUrl,
      primaryColor: org.primaryColor,
    },
  });
});

// Admin — update organization settings
router.put(
  '/settings',
  authenticateToken,
  requireRole('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, type, timezone, logoUrl, primaryColor } = req.body;
    const org = await prisma.organization.update({
      where: { id: req.organization!.id },
      data: { name, type, timezone, logoUrl, primaryColor },
    });
    res.json({ status: 'success', data: { organization: org } });
  })
);

export default router;
