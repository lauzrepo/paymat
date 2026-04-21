import { Request, Response } from 'express';
import prisma from '../config/database';
import stripeService from '../services/stripeService';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { config } from '../config/environment';

const ADMIN_URL = config.email.appUrl; // https://app.cliqpaymat.app
const ADMIN_PORTAL_URL = ADMIN_URL.replace('app.', 'admin.'); // https://admin.cliqpaymat.app

// POST /super-admin/billing/send-checkout/:orgId
// Creates (or reuses) a Stripe customer + checkout session and returns the URL
export const sendCheckoutLink = asyncHandler(async (req: Request, res: Response) => {
  const org = await prisma.organization.findUnique({ where: { id: req.params.orgId as string } });
  if (!org) throw new AppError(404, 'Organization not found');

  if (org.subscriptionStatus === 'active') {
    throw new AppError(400, 'Organization already has an active subscription');
  }

  // Get or create Stripe customer
  let customerId = org.stripeCustomerId;
  if (!customerId) {
    // Use first admin user's email as billing email
    const adminUser = await prisma.user.findFirst({
      where: { organizationId: org.id, role: 'admin', deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    const email = adminUser?.email ?? `billing+${org.slug}@cliqpaymat.app`;
    customerId = await stripeService.getOrCreateCustomer(org.id, org.name, email);
    await prisma.organization.update({ where: { id: org.id }, data: { stripeCustomerId: customerId } });
  }

  const session = await stripeService.createCheckoutSession(
    customerId,
    org.id,
    `${ADMIN_URL}/billing?success=true`,
    `${ADMIN_URL}/billing?canceled=true`
  );

  res.json({ status: 'success', data: { url: session.url, sessionId: session.id } });
});

// POST /super-admin/billing/portal/:orgId
// Returns a Stripe customer portal URL so the org can manage their own subscription
export const getPortalLink = asyncHandler(async (req: Request, res: Response) => {
  const org = await prisma.organization.findUnique({ where: { id: req.params.orgId as string } });
  if (!org) throw new AppError(404, 'Organization not found');
  if (!org.stripeCustomerId) throw new AppError(400, 'Organization has no billing account');

  const session = await stripeService.createPortalSession(
    org.stripeCustomerId,
    `${ADMIN_PORTAL_URL}/organizations/${org.id}`
  );

  res.json({ status: 'success', data: { url: session.url } });
});

// POST /api/billing/portal — called from the admin portal (logged-in org admin)
export const getOwnPortalLink = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const org = await prisma.organization.findUnique({ where: { id: req.organization!.id } });
  if (!org) throw new AppError(404, 'Organization not found');
  if (!org.stripeCustomerId) throw new AppError(400, 'No billing account set up yet');

  const session = await stripeService.createPortalSession(
    org.stripeCustomerId,
    `${ADMIN_URL}/billing`
  );

  res.json({ status: 'success', data: { url: session.url } });
});

// GET /api/billing/status — called from admin portal to show subscription status
export const getBillingStatus = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');
  const org = await prisma.organization.findUnique({
    where: { id: req.organization!.id },
    select: { subscriptionStatus: true, stripeCustomerId: true, stripeSubscriptionId: true },
  });
  if (!org) throw new AppError(404, 'Organization not found');
  res.json({ status: 'success', data: { billing: org } });
});
