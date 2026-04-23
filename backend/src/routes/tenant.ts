import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import prisma from '../config/database';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import stripeConnectService from '../services/stripeConnectService';
import { config } from '../config/environment';

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
      sandboxMode: org.sandboxMode,
      stripeConnectOnboardingComplete: org.stripeConnectOnboardingComplete,
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

// Admin — generate a fresh Stripe Connect onboarding link
router.post(
  '/stripe/onboarding-link',
  authenticateToken,
  requireRole('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const org = req.organization!;
    if (org.sandboxMode) throw new AppError(400, 'Organization is in sandbox mode');
    if (org.stripeConnectOnboardingComplete) throw new AppError(400, 'Stripe onboarding already complete');
    if (!org.stripeConnectAccountId) throw new AppError(400, 'No Stripe Connect account found');

    const appUrl = config.email.appUrl;
    const url = await stripeConnectService.createAccountOnboardingLink(
      org.stripeConnectAccountId,
      `${appUrl}/onboarding?stripe=connected`,
      `${appUrl}/onboarding?stripe=refresh`,
      false
    );

    res.json({ status: 'success', data: { url } });
  })
);

export default router;
